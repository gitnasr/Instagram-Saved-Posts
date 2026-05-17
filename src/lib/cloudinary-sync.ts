import { db } from "@/db";
import { accounts, posts, carouselMedia } from "@/db/schema";
import { getCloudinaryConfig, uploadToCloudinary, isCloudinaryConfigured } from "./cloudinary";
import { isNull, isNotNull, and, eq } from "drizzle-orm";
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
    throw new Error("Cloudinary credentials are not configured. Go to Settings first.");
  }

  // Query items that need uploading (cloudinary column is NULL, source URL is NOT NULL)
  const accountsToSync = db
    .select()
    .from(accounts)
    .where(
      and(isNull(accounts.cloudinaryProfilePicUrl), isNotNull(accounts.profilePicUrl))
    )
    .all();

  const postsToSync = db
    .select()
    .from(posts)
    .where(
      and(isNull(posts.cloudinaryThumbnailUrl), isNotNull(posts.thumbnailUrl))
    )
    .all();

  const carouselToSync = db
    .select()
    .from(carouselMedia)
    .where(
      and(isNull(carouselMedia.cloudinaryUrl), isNotNull(carouselMedia.mediaUrl))
    )
    .all();

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
        db.update(accounts)
          .set({ cloudinaryProfilePicUrl: url })
          .where(eq(accounts.pk, account.pk))
          .run();
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
        db.update(posts)
          .set({ cloudinaryThumbnailUrl: url })
          .where(eq(posts.pk, post.pk))
          .run();
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
        db.update(carouselMedia)
          .set({ cloudinaryUrl: url })
          .where(eq(carouselMedia.id, item.id))
          .run();
        currentSyncState.uploadedCarouselItems += 1;
      } else {
        currentSyncState.failedUploads += 1;
      }
      await delay(100);
    }

    currentSyncState.status = "completed";
  } catch (error) {
    currentSyncState.status = "failed";
    currentSyncState.errorMessage =
      error instanceof Error ? error.message : "Unknown error";
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
