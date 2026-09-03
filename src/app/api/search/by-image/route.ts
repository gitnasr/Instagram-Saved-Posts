import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveProfile, noActiveProfileResponse } from "@/lib/active-profile";
import { embedImageFromBuffer } from "@/lib/vector/image-embedding";
import {
  COLLECTIONS,
  getQdrantConfig,
  isQdrantConfigured,
  searchByVector,
  VectorIndexNotBuiltError,
} from "@/lib/vector/qdrant-client";
import type { VectorSearchHit } from "@/types";

const RESULT_LIMIT = 60;

export async function POST(request: NextRequest) {
  const profile = await getActiveProfile();
  if (!profile) return noActiveProfileResponse();

  if (!isQdrantConfigured(getQdrantConfig())) {
    return NextResponse.json(
      { error: "Vector search is not configured. Set QDRANT_URL environment variable.", needsIndexing: false },
      { status: 400 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("image");
  if (!(file instanceof Blob)) {
    return NextResponse.json(
      { error: "Missing 'image' file in form data." },
      { status: 400 }
    );
  }

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Image file exceeds maximum allowed size of 10MB." },
      { status: 413 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const vector = await embedImageFromBuffer(buffer);
    const hits = await searchByVector(COLLECTIONS.POST_IMAGES, vector, profile.id, RESULT_LIMIT);

    // Keep only the best-scoring hit per post, recording slide attribution
    interface HitDetails {
      score: number;
      source?: "thumbnail" | "carousel";
      carouselPosition?: number;
      imageUrl?: string;
    }
    const bestHitByPk = new Map<string, HitDetails>();
    for (const hit of hits) {
      const pk = hit.payload?.postPk;
      if (typeof pk !== "string") continue;
      // Filter out low similarity noise
      if (hit.score < 0.26) continue;
      const prev = bestHitByPk.get(pk);
      if (prev === undefined || hit.score > prev.score) {
        bestHitByPk.set(pk, {
          score: hit.score,
          source: hit.payload?.source as "thumbnail" | "carousel" | undefined,
          carouselPosition: hit.payload?.carouselPosition as number | undefined,
          imageUrl: hit.payload?.imageUrl as string | undefined,
        });
      }
    }

    const sortedHits = [...bestHitByPk.entries()].sort((a, b) => b[1].score - a[1].score);
    const topScore = sortedHits.length > 0 ? sortedHits[0][1].score : 0;

    // Filter by elbow drop-off (keep hits with score >= 65% of top score)
    const filteredHits = sortedHits.filter(([, h]) => topScore > 0 && h.score >= topScore * 0.65);

    const posts = await prisma.post.findMany({
      where: { profileId: profile.id, pk: { in: filteredHits.map(([pk]) => pk) } },
    });
    const postByPk = new Map(posts.map((p) => [p.pk, p]));

    const results: VectorSearchHit[] = [];
    for (const [pk, hit] of filteredHits) {
      const post = postByPk.get(pk);
      if (!post) continue;
      // Calibrate image-to-image score [0.26, 0.85] -> [0.45, 0.99]
      const norm = Math.max(0, Math.min(1, (hit.score - 0.26) / 0.55));
      const calibratedScore = Math.min(0.99, Math.max(0.45, 0.45 + norm * 0.54));
      results.push({
        post,
        score: calibratedScore,
        rawScore: hit.score,
        matchType: "visual",
        matchedSlideIndex: hit.carouselPosition,
        matchedImageUrl: hit.imageUrl,
      });
    }

    return NextResponse.json({ results });
  } catch (err: unknown) {
    if (err instanceof VectorIndexNotBuiltError) {
      return NextResponse.json(
        {
          error: "Vector index has not been built yet. Please index your saved posts first.",
          needsIndexing: true,
        },
        { status: 400 }
      );
    }
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("doesn't exist") || message.includes("Not found: Collection")) {
      return NextResponse.json(
        {
          error: "Vector index collection not found. Please run the indexer first.",
          needsIndexing: true,
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: `Vector search error: ${message}`, needsIndexing: false },
      { status: 500 }
    );
  }
}
