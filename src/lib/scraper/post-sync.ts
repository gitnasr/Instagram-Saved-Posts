/**
 * Everything the scraper writes about a *post*: the post row, its carousel
 * children, and the per-account saved-post tallies recomputed after a run.
 *
 * Like `account-sync`, this module knows nothing about `Runtime` — it returns
 * the timeline events it produced and leaves counters to the caller.
 */

import { prisma } from "../prisma";
import type { AccountEventDraft } from "../account-events";
import type { InstagramMedia } from "@/types/instagram";

/** Insert new carousel items or update existing ones with fresh URLs */
async function insertOrUpdateCarouselItems(
  profileId: string,
  postPk: string,
  media: InstagramMedia,
  isNewPost: boolean
): Promise<void> {
  if (!media.carousel_media || media.carousel_media.length === 0) return;

  const existingItems = isNewPost
    ? []
    : await prisma.carouselMedia.findMany({ where: { profileId, postPk } });

  for (let i = 0; i < media.carousel_media.length; i++) {
    const carouselItem = media.carousel_media[i];
    const imageUrl =
      carouselItem.image_versions2?.candidates?.[0]?.url ?? null;
    const videoUrl = carouselItem.video_versions?.[0]?.url ?? null;
    const width =
      carouselItem.image_versions2?.candidates?.[0]?.width ??
      carouselItem.video_versions?.[0]?.width ??
      null;
    const height =
      carouselItem.image_versions2?.candidates?.[0]?.height ??
      carouselItem.video_versions?.[0]?.height ??
      null;

    const existingItem = existingItems.find((item) => item.position === i);

    if (existingItem) {
      await prisma.carouselMedia.update({
        where: { id: existingItem.id },
        data: {
          mediaUrl: imageUrl ?? videoUrl ?? existingItem.mediaUrl,
          videoUrl: videoUrl ?? existingItem.videoUrl,
          width: width ?? existingItem.width,
          height: height ?? existingItem.height,
        },
      });
    } else {
      await prisma.carouselMedia.create({
        data: {
          profileId,
          postPk,
          position: i,
          mediaType: carouselItem.media_type,
          mediaUrl: imageUrl ?? videoUrl ?? "",
          width,
          height,
          videoUrl: videoUrl ?? null,
          videoDuration: carouselItem.video_duration ?? null,
          cloudinaryUrl: null, // Cloudinary sync will handle upload
        },
      });
    }
  }
}

interface PostSyncResult {
  events: AccountEventDraft[];
  isNewPost: boolean;
}

/** Create or refresh a saved post and its carousel children. */
export async function syncPostFromMedia(
  profileId: string,
  runId: number,
  media: InstagramMedia,
  now: string
): Promise<PostSyncResult> {
  const mediaPk = String(media.pk);
  const accountPkStr = String(media.user.pk);

  const existingPost = await prisma.post.findFirst({
    where: { profileId, pk: mediaPk },
  });

  const thumbnail = media.image_versions2?.candidates?.[0];
  const thumbnailUrl = thumbnail?.url ?? null;

  if (!existingPost) {
    await prisma.post.create({
      data: {
        profileId,
        pk: mediaPk,
        mediaId: media.id,
        code: media.code,
        accountPk: accountPkStr,
        mediaType: media.media_type,
        takenAt: media.taken_at,
        captionText: media.caption?.text ?? null,
        likeCount: media.like_count,
        commentCount: media.comment_count ?? 0,
        thumbnailUrl,
        cloudinaryThumbnailUrl: null, // Cloudinary sync will handle upload
        thumbnailWidth: thumbnail?.width ?? null,
        thumbnailHeight: thumbnail?.height ?? null,
        carouselMediaCount: media.carousel_media_count ?? null,
        scrapeRunId: runId,
        createdAt: now,
      },
    });

    await insertOrUpdateCarouselItems(profileId, mediaPk, media, true);

    // "A saved post we hadn't seen before" — the account's real post feed is
    // never fetched, so `takenAt` is carried in metadata to distinguish when
    // the post was published from when we discovered it.
    return {
      isNewPost: true,
      events: [
        {
          type: "new_post",
          occurredAt: now,
          toValue: media.code,
          metadata: JSON.stringify({ postPk: mediaPk, takenAt: media.taken_at }),
        },
      ],
    };
  }

  await prisma.post.update({
    where: { id: existingPost.id },
    data: {
      likeCount: media.like_count,
      commentCount: media.comment_count ?? 0,
      captionText: media.caption?.text ?? null,
      thumbnailUrl: thumbnailUrl ?? existingPost.thumbnailUrl, // refresh CDN URL
    },
  });

  await insertOrUpdateCarouselItems(profileId, mediaPk, media, false);

  return { isNewPost: false, events: [] };
}

export async function recalculateAccountPostCounts(
  profileId: string
): Promise<void> {
  const grouped = await prisma.post.groupBy({
    by: ["accountPk"],
    where: { profileId },
    _count: { _all: true },
  });
  const countByPk = new Map<string, number>(
    grouped.map((g) => [g.accountPk, g._count._all])
  );

  const accountsList = await prisma.account.findMany({
    where: { profileId },
    select: { id: true, pk: true, savedPostCount: true },
  });

  await Promise.all(
    accountsList.map((account) => {
      const desired = countByPk.get(account.pk) ?? 0;
      if (desired === account.savedPostCount) return Promise.resolve();
      return prisma.account.update({
        where: { id: account.id },
        data: { savedPostCount: desired },
      });
    })
  );
}
