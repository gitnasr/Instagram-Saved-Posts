import { NextResponse } from "next/server";
import { getQdrantConfig, isQdrantConfigured, VectorIndexNotBuiltError, type SearchHit } from "./qdrant-client";

export const RESULT_LIMIT = 60;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

/** Non-null when Qdrant isn't configured — return it straight from the route. */
export function qdrantNotConfiguredResponse(): NextResponse | null {
  if (isQdrantConfigured(getQdrantConfig())) return null;
  return NextResponse.json(
    {
      error: "Vector search is not configured. Set QDRANT_URL environment variable.",
      needsIndexing: false,
    },
    { status: 400 }
  );
}

/** Reads the `image` file from a multipart body, enforcing the upload size limit. */
export async function readUploadedImage(
  request: Request
): Promise<{ buffer: Buffer } | { error: NextResponse }> {
  const fail = (message: string, status: number) => ({
    error: NextResponse.json({ error: message }, { status }),
  });

  // Reject oversized uploads before buffering the whole body
  if (Number(request.headers.get("content-length") || 0) > MAX_UPLOAD_BYTES + 1024 * 1024) {
    return fail("Request payload exceeds maximum allowed size of 10MB.", 413);
  }

  const file = (await request.formData()).get("image");
  if (!(file instanceof Blob)) return fail("Missing 'image' file in form data.", 400);
  if (file.size > MAX_UPLOAD_BYTES) {
    return fail("Image file exceeds maximum allowed size of 10MB.", 413);
  }
  return { buffer: Buffer.from(await file.arrayBuffer()) };
}

/** Shared error envelope for every vector search route. */
export function searchErrorResponse(err: unknown): NextResponse {
  const message = err instanceof Error ? err.message : String(err);
  if (err instanceof VectorIndexNotBuiltError || /doesn't exist|Not found: Collection/.test(message)) {
    return NextResponse.json(
      {
        error: "Vector index has not been built yet. Please index your saved posts first.",
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

export interface BestHit {
  /** Higher is better, regardless of the collection's distance metric. */
  quality: number;
  carouselPosition?: number;
  imageUrl?: string;
}

/**
 * A post can have many indexed images (thumbnail + carousel slides); keep only its
 * best one. `quality` converts a raw Qdrant score to higher-is-better, or returns
 * null to drop the hit as noise.
 */
export function bestHitPerPost(
  hits: SearchHit[],
  quality: (score: number) => number | null
): Map<string, BestHit> {
  const best = new Map<string, BestHit>();
  for (const hit of hits) {
    const pk = hit.payload?.postPk;
    if (typeof pk !== "string") continue;
    const q = quality(hit.score);
    if (q === null) continue;
    const prev = best.get(pk);
    if (prev === undefined || q > prev.quality) {
      best.set(pk, {
        quality: q,
        carouselPosition: hit.payload?.carouselPosition as number | undefined,
        imageUrl: hit.payload?.imageUrl as string | undefined,
      });
    }
  }
  return best;
}

/**
 * Maps a raw similarity in [lo, hi] onto the confidence percentage shown in the UI.
 * CLIP cosine scores live in a narrow band (~0.2–0.4), so the raw number would read
 * as "24% match" for a perfect hit; this stretches that band to a legible range.
 */
export function calibrate(v: number, lo: number, hi: number, min: number, max: number): number {
  const t = Math.min(1, Math.max(0, (v - lo) / (hi - lo)));
  return min + t * (max - min);
}
