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

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_FILE_SIZE + 1024 * 1024) {
    return NextResponse.json(
      { error: "Request payload exceeds maximum allowed size of 10MB." },
      { status: 413 }
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

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Image file exceeds maximum allowed size of 10MB." },
      { status: 413 }
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

    const MAX_SEARCH_FACES = 5;
    if (queryFaces.length > MAX_SEARCH_FACES) {
      return NextResponse.json(
        {
          error: `Too many faces detected (${queryFaces.length}). Please upload an image with at most ${MAX_SEARCH_FACES} faces.`,
          results: [],
        },
        { status: 400 }
      );
    }

    // Multiple faces in the query photo (e.g. a small group shot) are all searched;
    // hits are merged by post below regardless of which query face matched.
    const hitLists = await Promise.all(
      queryFaces.map((face) =>
        searchByVector(COLLECTIONS.POST_FACES, face.descriptor, profile.id, RESULT_LIMIT)
      )
    );

    // Helper to extract true Euclidean distance regardless of Qdrant score representation
    const getEuclideanDistance = (score: number): number => {
      if (score <= 0) return Math.abs(score);
      if (score <= 1) return 1 / score - 1;
      return score;
    };

    interface FaceHitDetails {
      score: number;
      calibratedScore: number;
      distance: number;
      bbox?: VectorSearchHit["bbox"];
      carouselPosition?: number;
      imageUrl?: string;
    }

    const bestByPk = new Map<string, FaceHitDetails>();
    const FACE_DISTANCE_THRESHOLD = 0.62; // Standard FaceNet same-person identity boundary

    for (const hits of hitLists) {
      for (const hit of hits) {
        const pk = hit.payload?.postPk;
        if (typeof pk !== "string") continue;

        const distance = getEuclideanDistance(hit.score);
        // Exclude faces that exceed identity threshold
        if (distance > FACE_DISTANCE_THRESHOLD) continue;

        // Calibrate Euclidean distance [0.15, 0.62] -> [0.99, 0.50]
        const norm = Math.max(0, Math.min(1, (distance - 0.15) / (FACE_DISTANCE_THRESHOLD - 0.15)));
        const calibratedScore = Math.min(0.99, Math.max(0.50, 0.99 - norm * 0.49));

        const prev = bestByPk.get(pk);
        if (prev === undefined || calibratedScore > prev.calibratedScore) {
          bestByPk.set(pk, {
            score: hit.score,
            calibratedScore,
            distance,
            bbox: hit.payload?.bbox as VectorSearchHit["bbox"],
            carouselPosition: hit.payload?.carouselPosition as number | undefined,
            imageUrl: hit.payload?.imageUrl as string | undefined,
          });
        }
      }
    }

    const sortedHits = [...bestByPk.entries()]
      .sort((a, b) => b[1].calibratedScore - a[1].calibratedScore)
      .slice(0, RESULT_LIMIT);

    const targetPks = sortedHits.map(([pk]) => pk);
    const posts = await prisma.post.findMany({
      where: { profileId: profile.id, pk: { in: targetPks } },
    });
    const postByPk = new Map(posts.map((p) => [p.pk, p]));

    const results: VectorSearchHit[] = sortedHits
      .filter(([pk]) => postByPk.has(pk))
      .map(([pk, details]) => ({
        post: postByPk.get(pk)!,
        score: details.calibratedScore,
        rawScore: details.score,
        matchType: "face" as const,
        matchedSlideIndex: details.carouselPosition,
        matchedImageUrl: details.imageUrl,
        bbox: details.bbox,
      }));

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
