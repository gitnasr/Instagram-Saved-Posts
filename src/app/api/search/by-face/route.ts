import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveProfile, noActiveProfileResponse } from "@/lib/active-profile";
import { detectFacesFromBuffer } from "@/lib/vector/face-embedding";
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

// Standard FaceNet same-person identity boundary.
const FACE_DISTANCE_THRESHOLD = 0.62;
const MAX_SEARCH_FACES = 5;

export async function POST(request: NextRequest) {
  const profile = await getActiveProfile();
  if (!profile) return noActiveProfileResponse();

  const notConfigured = qdrantNotConfiguredResponse();
  if (notConfigured) return notConfigured;

  const upload = await readUploadedImage(request);
  if ("error" in upload) return upload.error;

  try {
    const queryFaces = await detectFacesFromBuffer(upload.buffer);
    if (queryFaces.length === 0) {
      return NextResponse.json(
        { error: "No face detected in the uploaded image.", results: [] },
        { status: 400 }
      );
    }
    if (queryFaces.length > MAX_SEARCH_FACES) {
      return NextResponse.json(
        {
          error: `Too many faces detected (${queryFaces.length}). Please upload an image with at most ${MAX_SEARCH_FACES} faces.`,
          results: [],
        },
        { status: 400 }
      );
    }

    // Every face in the query photo is searched; hits merge by post below,
    // regardless of which query face matched.
    const hitLists = await Promise.all(
      queryFaces.map((descriptor) =>
        searchByVector(COLLECTIONS.POST_FACES, descriptor, profile.id, RESULT_LIMIT)
      )
    );

    // The faces collection uses Euclid, so Qdrant's score IS the distance —
    // lower is better. Convert to closeness so higher is better everywhere else.
    const best = bestHitPerPost(hitLists.flat(), (distance) =>
      distance <= FACE_DISTANCE_THRESHOLD ? FACE_DISTANCE_THRESHOLD - distance : null
    );

    const sorted = [...best.entries()]
      .sort((a, b) => b[1].quality - a[1].quality)
      .slice(0, RESULT_LIMIT);

    const posts = await prisma.post.findMany({
      where: { profileId: profile.id, pk: { in: sorted.map(([pk]) => pk) } },
    });
    const postByPk = new Map(posts.map((p) => [p.pk, p]));

    const results: VectorSearchHit[] = [];
    for (const [pk, hit] of sorted) {
      const post = postByPk.get(pk);
      if (!post) continue;
      results.push({
        post,
        score: calibrate(hit.quality, 0, FACE_DISTANCE_THRESHOLD - 0.15, 0.5, 0.99),
        matchType: "face",
        matchedSlideIndex: hit.carouselPosition,
        matchedImageUrl: hit.imageUrl,
      });
    }

    return NextResponse.json({ results });
  } catch (err: unknown) {
    return searchErrorResponse(err);
  }
}
