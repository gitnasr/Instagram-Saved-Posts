import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { VectorIndexProgress } from "@/types";
import { embedImageFromBuffer } from "./image-embedding";
import { detectFacesFromBuffer } from "./face-embedding";
import {
  COLLECTIONS,
  ensureCollections,
  getQdrantConfig,
  isQdrantConfigured,
  pointId,
  upsertPoints,
  type PostVectorPayload,
} from "./qdrant-client";
import { saveProfileVectorStats, type VectorIndexStats } from "./stats";

// Per-profile index state in memory for real-time polling
const indexStates = new Map<string, VectorIndexProgress>();

export function getCurrentIndexState(profileId: string): VectorIndexProgress | null {
  return indexStates.get(profileId) ?? null;
}

interface IndexTarget {
  postPk: string;
  mediaType: number;
  source: "thumbnail" | "carousel";
  position: number;
  imageUrl: string;
}

/**
 * Collects target preview images to embed. Prefers Cloudinary CDN URLs, falling
 * back to the direct thumbnail URL so indexing works without Cloudinary configured.
 */
async function collectTargets(profileId: string): Promise<IndexTarget[]> {
  const targets: IndexTarget[] = [];

  const posts = await prisma.post.findMany({
    where: {
      profileId,
      OR: [{ cloudinaryThumbnailUrl: { not: null } }, { thumbnailUrl: { not: null } }],
    },
    select: { pk: true, mediaType: true, cloudinaryThumbnailUrl: true, thumbnailUrl: true },
  });

  for (const post of posts) {
    const imageUrl = post.cloudinaryThumbnailUrl || post.thumbnailUrl;
    if (!imageUrl) continue;
    targets.push({
      postPk: post.pk,
      mediaType: post.mediaType,
      source: "thumbnail",
      position: 0,
      imageUrl,
    });
  }

  const carouselItems = await prisma.carouselMedia.findMany({
    where: {
      profileId,
      mediaType: { not: 2 }, // Exclude standalone video slides
      OR: [{ cloudinaryUrl: { not: null } }, { mediaUrl: { not: "" } }],
    },
    select: { postPk: true, mediaType: true, position: true, cloudinaryUrl: true, mediaUrl: true },
  });

  for (const item of carouselItems) {
    const imageUrl = item.cloudinaryUrl || item.mediaUrl;
    if (!imageUrl) continue;
    targets.push({
      postPk: item.postPk,
      mediaType: item.mediaType,
      source: "carousel",
      position: item.position,
      imageUrl,
    });
  }

  return targets;
}

/** Instagram's CDN 403s requests without a browser UA + referer. */
async function fetchImageBuffer(url: string): Promise<Buffer> {
  const resp = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Referer: "https://www.instagram.com/",
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!resp.ok) throw new Error(`Failed to fetch image: ${url} (${resp.status})`);
  return Buffer.from(await resp.arrayBuffer());
}

const UPSERT_BATCH_SIZE = 25;

export async function runVectorIndex(profileId: string): Promise<void> {
  if (indexStates.get(profileId)?.status === "running") {
    throw new Error("A vector index run is already in progress for this profile");
  }

  const startTime = Date.now();
  const startIso = new Date(startTime).toISOString();

  // Reserve in-flight state synchronously, before any await
  const state: VectorIndexProgress = {
    status: "running",
    totalItems: 0,
    indexedItems: 0,
    facesIndexed: 0,
    failedItems: 0,
  };
  indexStates.set(profileId, state);

  const stats: VectorIndexStats = {
    profileId,
    status: "running",
    lastRunAt: startIso,
    lastCompletedAt: null,
    durationMs: null,
    cutoffPostDate: null,
    totalItems: 0,
    indexedItems: 0,
    facesIndexed: 0,
    failedItems: 0,
    lastError: null,
    updatedAt: startIso,
  };

  const syncStats = () => {
    stats.indexedItems = state.indexedItems;
    stats.facesIndexed = state.facesIndexed;
    stats.failedItems = state.failedItems;
    return saveProfileVectorStats(stats);
  };

  try {
    if (!isQdrantConfigured(getQdrantConfig())) {
      throw new Error("Qdrant is not configured. Set QDRANT_URL/QDRANT_API_KEY env vars.");
    }

    const newestPost = await prisma.post.findFirst({
      where: { profileId },
      orderBy: { takenAt: "desc" },
      select: { takenAt: true },
    });
    stats.cutoffPostDate = newestPost?.takenAt
      ? new Date(newestPost.takenAt * 1000).toISOString()
      : null;

    const targets = await collectTargets(profileId);
    state.totalItems = targets.length;
    stats.totalItems = targets.length;
    await syncStats();

    await ensureCollections();

    // Batched upserts avoid RocksDB open-file limits and connection saturation
    const imageBatch: { id: string; vector: number[]; payload: Record<string, unknown> }[] = [];
    const faceBatch: typeof imageBatch = [];

    const flushBatches = async (force = false) => {
      if (imageBatch.length >= UPSERT_BATCH_SIZE || (force && imageBatch.length > 0)) {
        await upsertPoints(COLLECTIONS.POST_IMAGES, imageBatch.splice(0));
      }
      if (faceBatch.length >= UPSERT_BATCH_SIZE || (force && faceBatch.length > 0)) {
        await upsertPoints(COLLECTIONS.POST_FACES, faceBatch.splice(0));
      }
    };

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      try {
        const payload: PostVectorPayload = {
          profileId,
          postPk: target.postPk,
          mediaType: target.mediaType,
          source: target.source,
          carouselPosition: target.position,
          imageUrl: target.imageUrl,
        };

        // One download feeds both the CLIP embedding and face detection
        const buffer = await fetchImageBuffer(target.imageUrl);

        imageBatch.push({
          id: pointId(profileId, target.postPk, target.source, target.position),
          vector: await embedImageFromBuffer(buffer),
          payload,
        });

        const faces = await detectFacesFromBuffer(buffer);
        faces.forEach((descriptor, faceIdx) => {
          faceBatch.push({
            id: pointId(profileId, target.postPk, target.source, target.position, faceIdx),
            vector: descriptor,
            payload,
          });
        });
        state.facesIndexed += faces.length;

        state.indexedItems += 1;
        await flushBatches();

        if (i > 0 && i % 50 === 0) await syncStats();
      } catch (error) {
        state.failedItems += 1;
        stats.lastError = error instanceof Error ? error.message : String(error);
        logger.error(
          { err: error, profileId, postPk: target.postPk, source: target.source },
          "[vector-index] Failed to index item"
        );
      }
    }

    await flushBatches(true);

    state.status = "completed";
    stats.status = "completed";
    stats.lastCompletedAt = new Date().toISOString();
    stats.durationMs = Date.now() - startTime;
    await syncStats();

    logger.info(
      {
        profileId,
        indexedItems: state.indexedItems,
        facesIndexed: state.facesIndexed,
        failedItems: state.failedItems,
        durationMs: stats.durationMs,
      },
      "[vector-index] Index run completed"
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    state.status = "failed";
    state.errorMessage = errorMsg;
    stats.status = "failed";
    stats.lastError = errorMsg;
    stats.durationMs = Date.now() - startTime;
    await syncStats();

    logger.error({ err: error, profileId }, "[vector-index] Index run failed");
  }
}
