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

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const vector = await embedImageFromBuffer(buffer);
    const hits = await searchByVector(COLLECTIONS.POST_IMAGES, vector, profile.id, RESULT_LIMIT);

    // Keep only the best-scoring hit per post
    const bestScoreByPk = new Map<string, number>();
    for (const hit of hits) {
      const pk = hit.payload?.postPk;
      if (typeof pk !== "string") continue;
      const prev = bestScoreByPk.get(pk);
      if (prev === undefined || hit.score > prev) bestScoreByPk.set(pk, hit.score);
    }

    const posts = await prisma.post.findMany({
      where: { profileId: profile.id, pk: { in: [...bestScoreByPk.keys()] } },
    });
    const postByPk = new Map(posts.map((p) => [p.pk, p]));

    const results: VectorSearchHit[] = [...bestScoreByPk.entries()]
      .map(([pk, score]) => ({ post: postByPk.get(pk), score }))
      .filter((r): r is VectorSearchHit => !!r.post)
      .sort((a, b) => b.score - a.score);

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
