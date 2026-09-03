import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveProfile, noActiveProfileResponse } from "@/lib/active-profile";
import { detectFacesFromBuffer } from "@/lib/vector/face-embedding";
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
    const queryFaces = await detectFacesFromBuffer(buffer);
    if (queryFaces.length === 0) {
      return NextResponse.json(
        { error: "No face detected in the uploaded image.", results: [] },
        { status: 200 }
      );
    }

    // Multiple faces in the query photo (e.g. a group shot) are all searched;
    // hits are merged by post below regardless of which query face matched.
    const hitLists = await Promise.all(
      queryFaces.map((face) =>
        searchByVector(COLLECTIONS.POST_FACES, face.descriptor, profile.id, RESULT_LIMIT)
      )
    );

    const bestByPk = new Map<string, { score: number; bbox?: VectorSearchHit["bbox"] }>();
    for (const hits of hitLists) {
      for (const hit of hits) {
        const pk = hit.payload?.postPk;
        if (typeof pk !== "string") continue;
        const prev = bestByPk.get(pk);
        if (prev === undefined || hit.score > prev.score) {
          bestByPk.set(pk, {
            score: hit.score,
            bbox: hit.payload?.bbox as VectorSearchHit["bbox"],
          });
        }
      }
    }

    const posts = await prisma.post.findMany({
      where: { profileId: profile.id, pk: { in: [...bestByPk.keys()] } },
    });
    const postByPk = new Map(posts.map((p) => [p.pk, p]));

    const results: VectorSearchHit[] = [...bestByPk.entries()]
      .filter(([pk]) => postByPk.has(pk))
      .map(([pk, { score, bbox }]) => ({ post: postByPk.get(pk)!, score, bbox }))
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
