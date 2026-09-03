import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveProfile, noActiveProfileResponse } from "@/lib/active-profile";
import { embedText } from "@/lib/vector/text-embedding";
import {
  COLLECTIONS,
  getQdrantConfig,
  isQdrantConfigured,
  searchByVector,
} from "@/lib/vector/qdrant-client";
import type { VectorSearchHit } from "@/types";

const RESULT_LIMIT = 60;

export async function POST(request: NextRequest) {
  const profile = await getActiveProfile();
  if (!profile) return noActiveProfileResponse();

  if (!isQdrantConfigured(getQdrantConfig())) {
    return NextResponse.json(
      { error: "Vector search is not configured. Set QDRANT_URL env var." },
      { status: 400 }
    );
  }

  let query: string | undefined;
  try {
    const body = await request.json();
    query = body.query;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body. Expected { query: string }." },
      { status: 400 }
    );
  }

  if (!query || typeof query !== "string" || !query.trim()) {
    return NextResponse.json(
      { error: "Query cannot be empty." },
      { status: 400 }
    );
  }

  const vector = await embedText(query.trim());
  const hits = await searchByVector(COLLECTIONS.POST_IMAGES, vector, profile.id, RESULT_LIMIT);

  // Keep highest similarity score per post
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
}
