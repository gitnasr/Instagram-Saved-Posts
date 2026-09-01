import { prisma } from "./prisma";
import {
  getCloudinaryConfig,
  uploadToCloudinary,
  isCloudinaryConfigured,
} from "./cloudinary";
import { logger } from "./logger";
import type { CloudinarySyncProgress } from "@/types";

// Per-profile sync state so syncs are independent across profiles.
const syncStates = new Map<string, CloudinarySyncProgress>();

export function getCurrentSyncState(
  profileId: string
): CloudinarySyncProgress | null {
  return syncStates.get(profileId) ?? null;
}

export async function runCloudinarySync(profileId: string): Promise<void> {
  if (syncStates.get(profileId)?.status === "running") {
    throw new Error("A Cloudinary sync is already in progress for this profile");
  }

  const config = getCloudinaryConfig();
  if (!isCloudinaryConfigured(config)) {
    throw new Error(
      "Cloudinary credentials are not configured. Set Cloudinary env vars."
    );
  }

  // Query items that need uploading (cloudinary field is null, source URL is set)
  const accountsToSync = await prisma.account.findMany({
    where: {
      profileId,
      cloudinaryProfilePicUrl: null,
      profilePicUrl: { not: null },
    },
  });

  const postsToSync = await prisma.post.findMany({
    where: {
      profileId,
      cloudinaryThumbnailUrl: null,
      thumbnailUrl: { not: null },
    },
  });

  const carouselToSync = await prisma.carouselMedia.findMany({
    where: { profileId, cloudinaryUrl: null, mediaUrl: { not: "" } },
  });

  const state: CloudinarySyncProgress = {
    status: "running",
    totalAccounts: accountsToSync.length,
    totalPosts: postsToSync.length,
    totalCarouselItems: carouselToSync.length,
    uploadedAccounts: 0,
    uploadedPosts: 0,
    uploadedCarouselItems: 0,
    failedUploads: 0,
  };
  syncStates.set(profileId, state);

  try {
    // Sync account profile pics
    for (const account of accountsToSync) {
      const url = await uploadToCloudinary(
        account.profilePicUrl!,
        "instagram-profiles",
        `profile_${profileId}_${account.pk}`,
        config
      );
      if (url) {
        await prisma.account.update({
          where: { id: account.id },
          data: { cloudinaryProfilePicUrl: url },
        });
        state.uploadedAccounts += 1;
      } else {
        state.failedUploads += 1;
      }
      await delay(100);
    }

    // Sync post thumbnails
    for (const post of postsToSync) {
      const url = await uploadToCloudinary(
        post.thumbnailUrl!,
        "instagram-posts",
        `post_${profileId}_${post.pk}`,
        config
      );
      if (url) {
        await prisma.post.update({
          where: { id: post.id },
          data: { cloudinaryThumbnailUrl: url },
        });
        state.uploadedPosts += 1;
      } else {
        state.failedUploads += 1;
      }
      await delay(100);
    }

    // Sync carousel media
    for (const item of carouselToSync) {
      const source = item.mediaUrl || item.videoUrl;
      if (!source) {
        state.failedUploads += 1;
        continue;
      }
      const url = await uploadToCloudinary(
        source,
        "instagram-carousel",
        `carousel_${profileId}_${item.postPk}_${item.position}`,
        config
      );
      if (url) {
        await prisma.carouselMedia.update({
          where: { id: item.id },
          data: { cloudinaryUrl: url },
        });
        state.uploadedCarouselItems += 1;
      } else {
        state.failedUploads += 1;
      }
      await delay(100);
    }

    state.status = "completed";
    logger.info(
      {
        profileId,
        uploadedAccounts: state.uploadedAccounts,
        uploadedPosts: state.uploadedPosts,
        uploadedCarouselItems: state.uploadedCarouselItems,
        failedUploads: state.failedUploads,
      },
      "[cloudinary-sync] Sync completed"
    );
  } catch (error) {
    state.status = "failed";
    state.errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.error({ err: error, profileId }, "[cloudinary-sync] Sync failed");
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
