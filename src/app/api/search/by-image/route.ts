import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveProfile, noActiveProfileResponse } from "@/lib/active-profile";
import { embedImageFromBuffer } from "@/lib/vector/image-embedding";
import { COLLECTIONS, searchByVector } from "@/lib/vector/qdrant-client";
import {
  RESULT_LIMIT,
  bestHitPerPost,
  calibrate,
  qdrantNotConfiguredResponse,
  readUploadedImage,
  searchErrorResponse,
} from "@/lib/vector/search-api";
import type { VectorSearchHit } from "@/types";

const NOISE_FLOOR = 0.26;
// Drop anything far below the best match for this query — image-to-image
// similarity has a sharp elbow, and everything past it is unrelated.
const ELBOW_RATIO = 0.65;

export async function POST(request: NextRequest) {
  const profile = await getActiveProfile();
  if (!profile) return noActiveProfileResponse();

  const notConfigured = qdrantNotConfiguredResponse();
  if (notConfigured) return notConfigured;

  const upload = await readUploadedImage(request);
  if ("error" in upload) return upload.error;

  try {
    const vector = await embedImageFromBuffer(upload.buffer);
    const hits = await searchByVector(COLLECTIONS.POST_IMAGES, vector, profile.id, RESULT_LIMIT);

    const sorted = [...bestHitPerPost(hits, (s) => (s >= NOISE_FLOOR ? s : null)).entries()].sort(
      (a, b) => b[1].quality - a[1].quality
    );
    const topScore = sorted[0]?.[1].quality ?? 0;
    const kept = sorted.filter(([, h]) => h.quality >= topScore * ELBOW_RATIO);

    const posts = await prisma.post.findMany({
      where: { profileId: profile.id, pk: { in: kept.map(([pk]) => pk) } },
    });
    const postByPk = new Map(posts.map((p) => [p.pk, p]));

    const results: VectorSearchHit[] = [];
    for (const [pk, hit] of kept) {
      const post = postByPk.get(pk);
      if (!post) continue;
      results.push({
        post,
        score: calibrate(hit.quality, NOISE_FLOOR, 0.81, 0.45, 0.99),
        matchType: "visual",
        matchedSlideIndex: hit.carouselPosition,
        matchedImageUrl: hit.imageUrl,
      });
    }

    return NextResponse.json({ results });
  } catch (err: unknown) {
    return searchErrorResponse(err);
  }
}
