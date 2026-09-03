import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { VectorIndexProgress } from "@/types";
import { embedImageFromUrl } from "./image-embedding";
import { detectFacesFromUrl } from "./face-embedding";
import {
  COLLECTIONS,
  ensureCollections,
  getQdrantConfig,
  isQdrantConfigured,
  pointId,
  upsertPoints,
  type FaceVectorPayload,
  type PostVectorPayload,
} from "./qdrant-client";

// Per-profile index state, mirrors src/lib/cloudinary-sync.ts's syncStates map.
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
 * Collects target preview images to embed. Supports Cloudinary CDN URLs as
 * first preference, with automatic fallback to direct/proxied thumbnail URLs
 * so indexing functions properly even without Cloudinary configured.
 */
async function collectTargets(profileId: string): Promise<IndexTarget[]> {
  const targets: IndexTarget[] = [];

  const posts = await prisma.post.findMany({
    where: {
      profileId,
      OR: [
        { cloudinaryThumbnailUrl: { not: null } },
        { thumbnailUrl: { not: null } },
      ],
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
      OR: [
        { cloudinaryUrl: { not: null } },
        { mediaUrl: { not: "" } },
      ],
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

export async function runVectorIndex(profileId: string): Promise<void> {
  if (indexStates.get(profileId)?.status === "running") {
    throw new Error("A vector index run is already in progress for this profile");
  }

  const qdrantConfig = getQdrantConfig();
  if (!isQdrantConfigured(qdrantConfig)) {
    throw new Error("Qdrant is not configured. Set QDRANT_URL/QDRANT_API_KEY env vars.");
  }

  const targets = await collectTargets(profileId);

  const state: VectorIndexProgress = {
    status: "running",
    totalItems: targets.length,
    indexedItems: 0,
    facesIndexed: 0,
    failedItems: 0,
  };
  indexStates.set(profileId, state);

  try {
    await ensureCollections();

    for (const target of targets) {
      try {
        const imagePayload: PostVectorPayload = {
          profileId,
          postPk: target.postPk,
          mediaType: target.mediaType,
          source: target.source,
          carouselPosition: target.position,
        };

        const imageVector = await embedImageFromUrl(target.imageUrl);
        await upsertPoints(COLLECTIONS.POST_IMAGES, [
          {
            id: pointId(profileId, target.postPk, target.source, target.position),
            vector: imageVector,
            payload: imagePayload,
          },
        ]);

        const faces = await detectFacesFromUrl(target.imageUrl);
        if (faces.length > 0) {
          const facePoints = faces.map((face, i) => {
            const payload: FaceVectorPayload = { ...imagePayload, bbox: face.bbox };
            return {
              id: pointId(profileId, target.postPk, target.source, target.position, i),
              vector: face.descriptor,
              payload,
            };
          });
          await upsertPoints(COLLECTIONS.POST_FACES, facePoints);
          state.facesIndexed += faces.length;
        }

        state.indexedItems += 1;
      } catch (error) {
        state.failedItems += 1;
        logger.error(
          { err: error, profileId, postPk: target.postPk, source: target.source },
          "[vector-index] Failed to index item"
        );
      }
    }

    state.status = "completed";
    logger.info(
      {
        profileId,
        indexedItems: state.indexedItems,
        facesIndexed: state.facesIndexed,
        failedItems: state.failedItems,
      },
      "[vector-index] Index run completed"
    );
  } catch (error) {
    state.status = "failed";
    state.errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error({ err: error, profileId }, "[vector-index] Index run failed");
  }
}
