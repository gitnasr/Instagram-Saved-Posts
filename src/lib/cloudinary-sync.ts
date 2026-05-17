import { prisma } from "./prisma";
import {
  getCloudinaryConfig,
  uploadToCloudinary,
  isCloudinaryConfigured,
} from "./cloudinary";
import { logger } from "./logger";
import * as Sentry from "@sentry/nextjs";
import type { CloudinarySyncProgress } from "@/types";

let currentSyncState: CloudinarySyncProgress | null = null;

export function getCurrentSyncState(): CloudinarySyncProgress | null {
  return currentSyncState;
}

export async function runCloudinarySync(): Promise<void> {
  if (currentSyncState?.status === "running") {
    throw new Error("A Cloudinary sync is already in progress");
  }

  const config = getCloudinaryConfig();
  if (!isCloudinaryConfigured(config)) {
    throw new Error(
      "Cloudinary credentials are not configured. Set Cloudinary env vars."
    );
  }

  // Query items that need uploading (cloudinary field is null, source URL is set)
  const accountsToSync = await prisma.account.findMany({
    where: { cloudinaryProfilePicUrl: null, profilePicUrl: { not: null } },
  });

  const postsToSync = await prisma.post.findMany({
    where: { cloudinaryThumbnailUrl: null, thumbnailUrl: { not: null } },
  });

  const carouselToSync = await prisma.carouselMedia.findMany({
    where: { cloudinaryUrl: null, mediaUrl: { not: "" } },
  });

  currentSyncState = {
    status: "running",
    totalAccounts: accountsToSync.length,
    totalPosts: postsToSync.length,
    totalCarouselItems: carouselToSync.length,
    uploadedAccounts: 0,
    uploadedPosts: 0,
    uploadedCarouselItems: 0,
    failedUploads: 0,
  };

  try {
    // Sync account profile pics
    for (const account of accountsToSync) {
      const url = await uploadToCloudinary(
        account.profilePicUrl!,
        "instagram-profiles",
        `profile_${account.pk}`,
        config
      );
      if (url) {
        await prisma.account.update({
          where: { pk: account.pk },
          data: { cloudinaryProfilePicUrl: url },
        });
        currentSyncState.uploadedAccounts += 1;
      } else {
        currentSyncState.failedUploads += 1;
      }
      await delay(100);
    }

    // Sync post thumbnails
    for (const post of postsToSync) {
      const url = await uploadToCloudinary(
        post.thumbnailUrl!,
        "instagram-posts",
        `post_${post.pk}`,
        config
      );
      if (url) {
        await prisma.post.update({
          where: { pk: post.pk },
          data: { cloudinaryThumbnailUrl: url },
        });
        currentSyncState.uploadedPosts += 1;
      } else {
        currentSyncState.failedUploads += 1;
      }
      await delay(100);
    }

    // Sync carousel media
    for (const item of carouselToSync) {
      const source = item.mediaUrl || item.videoUrl;
      if (!source) {
        currentSyncState.failedUploads += 1;
        continue;
      }
      const url = await uploadToCloudinary(
        source,
        "instagram-carousel",
        `carousel_${item.postPk}_${item.position}`,
        config
      );
      if (url) {
        await prisma.carouselMedia.update({
          where: { id: item.id },
          data: { cloudinaryUrl: url },
        });
        currentSyncState.uploadedCarouselItems += 1;
      } else {
        currentSyncState.failedUploads += 1;
      }
      await delay(100);
    }

    currentSyncState.status = "completed";
    logger.info(
      {
        uploadedAccounts: currentSyncState.uploadedAccounts,
        uploadedPosts: currentSyncState.uploadedPosts,
        uploadedCarouselItems: currentSyncState.uploadedCarouselItems,
        failedUploads: currentSyncState.failedUploads,
      },
      "[cloudinary-sync] Sync completed"
    );
  } catch (error) {
    currentSyncState.status = "failed";
    currentSyncState.errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    Sentry.captureException(error, { tags: { feature: "cloudinary-sync" } });
    logger.error({ err: error }, "[cloudinary-sync] Sync failed");
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
