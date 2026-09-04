import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveProfile, noActiveProfileResponse } from "@/lib/active-profile";
import { embedText } from "@/lib/vector/text-embedding";
import { COLLECTIONS, searchByVector } from "@/lib/vector/qdrant-client";
import {
  RESULT_LIMIT,
  bestHitPerPost,
  calibrate,
  qdrantNotConfiguredResponse,
  searchErrorResponse,
} from "@/lib/vector/search-api";
import type { VectorSearchHit } from "@/types";

const MAX_QUERY_LENGTH = 1000;

// Reciprocal Rank Fusion tuning. Text matches outweigh visual ones because an
// exact caption/author hit is a stronger signal than a CLIP similarity.
const RRF_K = 60;
const WEIGHT_VECTOR = 1.0;
const WEIGHT_TEXT = 1.3;

// Below this raw cosine score a vector hit is noise.
const VECTOR_NOISE_FLOOR = 0.2;
// A visual-only candidate (no text match) must also clear an absolute floor and
// a fraction of this query's best visual score.
const VISUAL_ELBOW_FLOOR = 0.22;
const VISUAL_ELBOW_RATIO = 0.65;

type MatchType = NonNullable<VectorSearchHit["matchType"]>;

/** Lexical search over captions and creator accounts, best matches first. */
async function textSearch(profileId: string, rawQuery: string) {
  const terms = rawQuery
    .split(/\s+/)
    .map((t) => t.replace(/^[#@]/, "").trim())
    .filter((t) => t.length >= 2);

  const matchingAccounts = await prisma.account.findMany({
    where: {
      profileId,
      OR: [
        { username: { contains: rawQuery, mode: "insensitive" } },
        { fullName: { contains: rawQuery, mode: "insensitive" } },
      ],
    },
    select: { pk: true },
    take: 30,
  });
  const accountPks = matchingAccounts.map((a) => a.pk);

  const conditions: import("@prisma/client").Prisma.PostWhereInput[] = [
    { captionText: { contains: rawQuery, mode: "insensitive" } },
  ];
  if (accountPks.length > 0) conditions.push({ accountPk: { in: accountPks } });
  if (terms.length > 1) {
    conditions.push({
      AND: terms.map((term) => ({
        captionText: { contains: term, mode: "insensitive" as const },
      })),
    });
  }

  const posts = await prisma.post.findMany({
    where: { profileId, OR: conditions },
    select: { pk: true, captionText: true, accountPk: true },
    take: RESULT_LIMIT,
  });

  const lowerQuery = rawQuery.toLowerCase();
  return posts
    .map((p) => {
      const isAccount = accountPks.includes(p.accountPk);
      // Whole-query caption hit beats an author hit, which beats a term-only hit.
      const priority = p.captionText?.toLowerCase().includes(lowerQuery) ? 1 : isAccount ? 2 : 3;
      return { pk: p.pk, priority, isAccount };
    })
    .sort((a, b) => a.priority - b.priority);
}

export async function POST(request: NextRequest) {
  const profile = await getActiveProfile();
  if (!profile) return noActiveProfileResponse();

  const notConfigured = qdrantNotConfiguredResponse();
  if (notConfigured) return notConfigured;

  let query: unknown;
  try {
    query = (await request.json())?.query;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body. Expected { query: string }." },
      { status: 400 }
    );
  }

  if (typeof query !== "string" || !query.trim()) {
    return NextResponse.json({ error: "Query cannot be empty." }, { status: 400 });
  }
  if (query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json(
      { error: `Query exceeds maximum length of ${MAX_QUERY_LENGTH} characters.` },
      { status: 413 }
    );
  }

  const rawQuery = query.trim();

  try {
    // Vector failure is tolerated as long as the lexical side found something.
    const vectorPromise = embedText(rawQuery)
      .then((v) => searchByVector(COLLECTIONS.POST_IMAGES, v, profile.id, RESULT_LIMIT))
      .catch((e: unknown) => e);

    const [vectorResult, textMatches] = await Promise.all([
      vectorPromise,
      textSearch(profile.id, rawQuery),
    ]);

    if (!Array.isArray(vectorResult) && textMatches.length === 0) {
      throw vectorResult;
    }
    const vectorHits = Array.isArray(vectorResult) ? vectorResult : [];

    const bestVisual = bestHitPerPost(vectorHits, (s) => (s >= VECTOR_NOISE_FLOOR ? s : null));
    const rankedVisual = [...bestVisual.entries()].sort((a, b) => b[1].quality - a[1].quality);
    const visualRank = new Map(rankedVisual.map(([pk], i) => [pk, i + 1]));
    const topVisualScore = rankedVisual[0]?.[1].quality ?? 0;

    const textRank = new Map(
      textMatches.map((m, i) => [
        m.pk,
        { rank: i + 1, matchType: (m.isAccount ? "account" : "caption") as MatchType },
      ])
    );

    interface Candidate {
      pk: string;
      rrfScore: number;
      score: number;
      matchType: MatchType;
      matchedSlideIndex?: number;
      matchedImageUrl?: string;
    }
    const candidates: Candidate[] = [];

    for (const pk of new Set([...visualRank.keys(), ...textRank.keys()])) {
      const vRank = visualRank.get(pk);
      const tInfo = textRank.get(pk);
      const vMatch = bestVisual.get(pk);

      // Visual-only candidates below the elbow are noise, not results.
      if (!tInfo && vMatch) {
        if (
          vMatch.quality < VISUAL_ELBOW_FLOOR ||
          vMatch.quality < topVisualScore * VISUAL_ELBOW_RATIO
        ) {
          continue;
        }
      }

      const rrfScore =
        (vRank !== undefined ? WEIGHT_VECTOR / (RRF_K + vRank) : 0) +
        (tInfo !== undefined ? WEIGHT_TEXT / (RRF_K + tInfo.rank) : 0);

      let matchType: MatchType = "visual";
      let score = 0.5;
      if (vRank !== undefined && tInfo !== undefined) {
        // Matching on both signals is the strongest evidence we have.
        matchType = "hybrid";
        score = calibrate(vMatch?.quality ?? 0.25, VECTOR_NOISE_FLOOR, 0.42, 0.88, 0.99);
      } else if (tInfo !== undefined) {
        matchType = tInfo.matchType;
        score = tInfo.rank <= 3 ? 0.92 : 0.85;
      } else if (vMatch !== undefined) {
        score = calibrate(vMatch.quality, VECTOR_NOISE_FLOOR, 0.4, 0.45, 0.95);
      }

      candidates.push({
        pk,
        rrfScore,
        score,
        matchType,
        matchedSlideIndex: vMatch?.carouselPosition,
        matchedImageUrl: vMatch?.imageUrl,
      });
    }

    const top = candidates.sort((a, b) => b.rrfScore - a.rrfScore).slice(0, RESULT_LIMIT);

    const posts = await prisma.post.findMany({
      where: { profileId: profile.id, pk: { in: top.map((c) => c.pk) } },
    });
    const postByPk = new Map(posts.map((p) => [p.pk, p]));

    const results: VectorSearchHit[] = [];
    for (const c of top) {
      const post = postByPk.get(c.pk);
      if (!post) continue;
      results.push({
        post,
        score: c.score,
        matchType: c.matchType,
        matchedSlideIndex: c.matchedSlideIndex,
        matchedImageUrl: c.matchedImageUrl,
      });
    }

    return NextResponse.json({ results });
  } catch (err: unknown) {
    return searchErrorResponse(err);
  }
}
