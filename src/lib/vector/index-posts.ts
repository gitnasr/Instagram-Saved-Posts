import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";
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
 * Video carousel slides have no guaranteed static frame (mediaUrl can fall
 * back to the raw video file — see src/lib/scraper.ts), so only photo slides
 * are indexed. Top-level Post.thumbnailUrl is always a static preview image
 * regardless of mediaType, so video posts (Reels) are indexed via that.
 */
async function collectTargets(profileId: string): Promise<IndexTarget[]> {
  const targets: IndexTarget[] = [];

  const posts = await prisma.post.findMany({
    where: { profileId, cloudinaryThumbnailUrl: { not: null } },
    select: { pk: true, mediaType: true, cloudinaryThumbnailUrl: true },
  });
  for (const post of posts) {
    targets.push({
      postPk: post.pk,
      mediaType: post.mediaType,
      source: "thumbnail",
      position: 0,
      imageUrl: post.cloudinaryThumbnailUrl!,
    });
  }

  const carouselItems = await prisma.carouselMedia.findMany({
    where: { profileId, cloudinaryUrl: { not: null }, mediaType: { not: 2 } },
    select: { postPk: true, mediaType: true, position: true, cloudinaryUrl: true },
  });
  for (const item of carouselItems) {
    targets.push({
      postPk: item.postPk,
      mediaType: item.mediaType,
      source: "carousel",
      position: item.position,
      imageUrl: item.cloudinaryUrl!,
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
    Sentry.captureException(error, { tags: { feature: "vector-index" } });
    logger.error({ err: error, profileId }, "[vector-index] Index run failed");
  }
}
