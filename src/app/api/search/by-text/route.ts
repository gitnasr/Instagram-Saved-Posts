import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveProfile, noActiveProfileResponse } from "@/lib/active-profile";
import { embedText } from "@/lib/vector/text-embedding";
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
      {
        error: "Vector search is not configured. Set QDRANT_URL environment variable.",
        needsIndexing: false,
      },
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

  try {
    const rawQuery = query.trim();
    const vectorPromise = (async () => {
      try {
        const vector = await embedText(rawQuery);
        return await searchByVector(COLLECTIONS.POST_IMAGES, vector, profile.id, RESULT_LIMIT);
      } catch (e) {
        // If vector index is not built yet, we will bubble it up if text search also finds nothing
        return e;
      }
    })();

    // Lexical / Full-Text Search across captions, hashtags, and creator accounts
    const textSearchPromise = (async () => {
      const cleanTerms = rawQuery
        .split(/\s+/)
        .map((t) => t.replace(/^[#@]/, "").trim())
        .filter((t) => t.length >= 2);

      // 1. Find creator accounts matching query
      const matchingAccounts = await prisma.account.findMany({
        where: {
          profileId: profile.id,
          OR: [
            { username: { contains: rawQuery, mode: "insensitive" } },
            { fullName: { contains: rawQuery, mode: "insensitive" } },
          ],
        },
        select: { pk: true, username: true },
        take: 30,
      });
      const matchingAccountPks = matchingAccounts.map((a) => a.pk);

      // 2. Find posts matching caption or creator
      const textConditions: import("@prisma/client").Prisma.PostWhereInput[] = [
        { captionText: { contains: rawQuery, mode: "insensitive" } },
      ];
      if (matchingAccountPks.length > 0) {
        textConditions.push({ accountPk: { in: matchingAccountPks } });
      }
      for (const term of cleanTerms) {
        textConditions.push({ captionText: { contains: term, mode: "insensitive" } });
      }

      const posts = await prisma.post.findMany({
        where: {
          profileId: profile.id,
          OR: textConditions,
        },
        select: { pk: true, captionText: true, accountPk: true },
        take: RESULT_LIMIT,
      });

      const lowerQuery = rawQuery.toLowerCase();
      return posts
        .map((p) => {
          const hasExact = p.captionText?.toLowerCase().includes(lowerQuery);
          const isAccount = matchingAccountPks.includes(p.accountPk);
          let priority = 3;
          if (hasExact) priority = 1;
          else if (isAccount) priority = 2;
          return { pk: p.pk, priority, isAccount };
        })
        .sort((a, b) => a.priority - b.priority);
    })();

    const [vectorResult, textMatches] = await Promise.all([vectorPromise, textSearchPromise]);

    if (vectorResult instanceof Error) {
      // If vector search failed because collection missing and we found no text matches either, rethrow
      if (
        textMatches.length === 0 &&
        (vectorResult instanceof VectorIndexNotBuiltError ||
          vectorResult.message.includes("doesn't exist") ||
          vectorResult.message.includes("Not found: Collection"))
      ) {
        throw vectorResult;
      }
    }

    const vectorHits = Array.isArray(vectorResult) ? vectorResult : [];

    // Collect best visual hit per post
    interface VisualMatch {
      score: number;
      source?: "thumbnail" | "carousel";
      carouselPosition?: number;
      imageUrl?: string;
    }
    const bestVisualByPk = new Map<string, VisualMatch>();
    for (const hit of vectorHits) {
      const pk = hit.payload?.postPk;
      if (typeof pk !== "string") continue;
      // Filter out pure noise (unrelated cosine similarities < 0.20)
      if (hit.score < 0.20) continue;
      const prev = bestVisualByPk.get(pk);
      if (prev === undefined || hit.score > prev.score) {
        bestVisualByPk.set(pk, {
          score: hit.score,
          source: hit.payload?.source as "thumbnail" | "carousel" | undefined,
          carouselPosition: hit.payload?.carouselPosition as number | undefined,
          imageUrl: hit.payload?.imageUrl as string | undefined,
        });
      }
    }

    // Rank visual results
    const rankedVisual = [...bestVisualByPk.entries()].sort((a, b) => b[1].score - a[1].score);
    const visualRankByPk = new Map<string, number>();
    rankedVisual.forEach(([pk], i) => visualRankByPk.set(pk, i + 1));
    const topVisualScore = rankedVisual.length > 0 ? rankedVisual[0][1].score : 0;

    // Rank text results
    const textRankByPk = new Map<string, { rank: number; matchType: "caption" | "account" }>();
    textMatches.forEach((match, i) => {
      textRankByPk.set(match.pk, {
        rank: i + 1,
        matchType: match.isAccount ? "account" : "caption",
      });
    });

    // Merge via Reciprocal Rank Fusion (RRF)
    const allPks = new Set([...visualRankByPk.keys(), ...textRankByPk.keys()]);
    const RRF_K = 60;
    const WEIGHT_VECTOR = 1.0;
    const WEIGHT_TEXT = 1.3;

    interface MergedCandidate {
      pk: string;
      rrfScore: number;
      calibratedScore: number;
      rawScore?: number;
      matchType: "hybrid" | "visual" | "caption" | "account";
      matchedSlideIndex?: number;
      matchedImageUrl?: string;
    }

    const candidates: MergedCandidate[] = [];

    for (const pk of allPks) {
      const vRank = visualRankByPk.get(pk);
      const tInfo = textRankByPk.get(pk);
      const vMatch = bestVisualByPk.get(pk);

      // Apply elbow filter for pure visual matches:
      // If post only matched visually and its score is below 65% of the top visual score, skip noise
      if (!tInfo && vMatch) {
        if (vMatch.score < 0.22 || (topVisualScore > 0 && vMatch.score < topVisualScore * 0.65)) {
          continue;
        }
      }

      const vRrf = vRank !== undefined ? WEIGHT_VECTOR / (RRF_K + vRank) : 0;
      const tRrf = tInfo !== undefined ? WEIGHT_TEXT / (RRF_K + tInfo.rank) : 0;
      const rrfScore = vRrf + tRrf;

      let matchType: "hybrid" | "visual" | "caption" | "account" = "visual";
      let calibratedScore = 0.5;

      if (vRank !== undefined && tInfo !== undefined) {
        matchType = "hybrid";
        // Hybrid matches get highest confidence (88% - 99%)
        const base = 0.88;
        const boost = Math.min(0.11, ((vMatch?.score ?? 0.25) - 0.20) * 0.5);
        calibratedScore = Math.min(0.99, base + boost);
      } else if (tInfo !== undefined) {
        matchType = tInfo.matchType;
        calibratedScore = tInfo.rank <= 3 ? 0.92 : 0.85;
      } else if (vMatch !== undefined) {
        matchType = "visual";
        // Calibrate raw cosine score [0.20, 0.40] -> [0.45, 0.95]
        const normScore = Math.max(0, Math.min(1, (vMatch.score - 0.20) / 0.20));
        calibratedScore = Math.min(0.95, Math.max(0.45, 0.45 + normScore * 0.5));
      }

      candidates.push({
        pk,
        rrfScore,
        calibratedScore,
        rawScore: vMatch?.score,
        matchType,
        matchedSlideIndex: vMatch?.carouselPosition,
        matchedImageUrl: vMatch?.imageUrl,
      });
    }

    candidates.sort((a, b) => b.rrfScore - a.rrfScore);
    const topCandidates = candidates.slice(0, RESULT_LIMIT);

    const posts = await prisma.post.findMany({
      where: { profileId: profile.id, pk: { in: topCandidates.map((c) => c.pk) } },
    });
    const postByPk = new Map(posts.map((p) => [p.pk, p]));

    const results: VectorSearchHit[] = [];
    for (const c of topCandidates) {
      const post = postByPk.get(c.pk);
      if (!post) continue;
      results.push({
        post,
        score: c.calibratedScore,
        rawScore: c.rawScore,
        matchType: c.matchType,
        matchedSlideIndex: c.matchedSlideIndex,
        matchedImageUrl: c.matchedImageUrl,
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
