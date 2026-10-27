import { NextRequest, NextResponse } from "next/server";
import { APP_VERSION } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { buildUpdateInfo, type GithubRelease, type UpdatesResponse } from "@/lib/updates";

export const dynamic = "force-dynamic";

const RELEASES_API =
  "https://api.github.com/repos/gitnasr/Instagram-Saved-Posts/releases?per_page=30";
const TTL_MS = 60 * 60_000;
const FAILURE_TTL_MS = 5 * 60_000;
const MIN_REFRESH_MS = 30_000;
const TIMEOUT_MS = 5_000;

// ponytail: per-process cache; fine for a single container, no shared store needed.
let cache: { at: number; data: UpdatesResponse } | null = null;
let inflight: Promise<UpdatesResponse> | null = null;

function unavailable(reason: string): UpdatesResponse {
  return { status: "unavailable", current: APP_VERSION, reason, checkedAt: new Date().toISOString() };
}

async function fetchReleases(): Promise<UpdatesResponse> {
  try {
    const res = await fetch(RELEASES_API, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": `instagram-saved-posts/${APP_VERSION}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.status === 403 || res.status === 429) return unavailable("GitHub rate limit reached");
    if (!res.ok) return unavailable(`GitHub returned ${res.status}`);
    const json: unknown = await res.json();
    if (!Array.isArray(json)) return unavailable("Unexpected response from GitHub");
    return buildUpdateInfo(APP_VERSION, json as GithubRelease[], new Date().toISOString());
  } catch (err) {
    // Offline or air-gapped installs are normal; keep it out of the warn/error stream.
    logger.debug({ err }, "update check failed");
    return unavailable("Could not reach GitHub");
  }
}

export async function GET(request: NextRequest) {
  if (process.env.DISABLE_UPDATE_CHECK?.trim().toLowerCase() === "true") {
    return NextResponse.json({ status: "disabled", current: APP_VERSION } satisfies UpdatesResponse);
  }

  const now = Date.now();
  const refresh = request.nextUrl.searchParams.get("refresh") === "1";
  const ttl = cache?.data.status === "ok" ? TTL_MS : FAILURE_TTL_MS;
  const fresh = cache && now - cache.at < ttl;
  // A forced refresh only bypasses the cache if the last fetch is older than MIN_REFRESH_MS.
  const bypass = refresh && (!cache || now - cache.at >= MIN_REFRESH_MS);

  if (cache && fresh && !bypass) return NextResponse.json(cache.data);

  inflight ??= fetchReleases().finally(() => {
    inflight = null;
  });
  const data = await inflight;
  cache = { at: Date.now(), data };
  return NextResponse.json(data);
}
