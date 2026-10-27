/**
 * Pure helpers for the update check: semver comparison and release-body
 * parsing. No I/O and no imports, so scripts/test-updates.ts can run it with
 * plain `npx tsx`. The body format is defined in wiki/release-contract.md.
 */

export type UpgradeLevel = "routine" | "attention" | "breaking" | "unknown";

export interface ReleaseInfo {
  version: string;
  name: string;
  publishedAt: string | null;
  url: string;
  upgrade: UpgradeLevel;
  /** null when the release predates the meta comment. */
  schema: boolean | null;
  env: boolean | null;
  compose: boolean | null;
  /** Text of the `## What to expect` section, null on old-format releases. */
  whatToExpect: string | null;
  /** Release body without the meta comment, capped. Raw body for old releases. */
  notes: string;
}

export type UpdatesResponse =
  | {
      status: "ok";
      current: string;
      checkedAt: string;
      latest: Pick<ReleaseInfo, "version" | "publishedAt" | "url" | "name"> | null;
      updateAvailable: boolean;
      missed: ReleaseInfo[];
    }
  | { status: "disabled"; current: string }
  | { status: "unavailable"; current: string; reason: string; checkedAt: string };

/** Shape of the GitHub release fields we read. */
export interface GithubRelease {
  tag_name?: unknown;
  name?: unknown;
  body?: unknown;
  html_url?: unknown;
  published_at?: unknown;
  draft?: unknown;
  prerelease?: unknown;
}

const SEMVER = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;
const MAX_NOTES = 1500;

export interface Semver {
  core: [number, number, number];
  pre: string[];
}

export function parseVersion(input: string | null | undefined): Semver | null {
  const m = SEMVER.exec((input ?? "").trim());
  if (!m) return null;
  return {
    core: [Number(m[1]), Number(m[2]), Number(m[3])],
    pre: m[4] ? m[4].split(".") : [],
  };
}

/** Standard semver precedence: -1, 0, 1. A prerelease sorts below its release. */
export function compareSemver(a: Semver, b: Semver): number {
  for (let i = 0; i < 3; i++) {
    if (a.core[i] !== b.core[i]) return a.core[i] < b.core[i] ? -1 : 1;
  }
  if (!a.pre.length || !b.pre.length) {
    return a.pre.length === b.pre.length ? 0 : a.pre.length ? -1 : 1;
  }
  const n = Math.max(a.pre.length, b.pre.length);
  for (let i = 0; i < n; i++) {
    const x = a.pre[i];
    const y = b.pre[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    if (x === y) continue;
    const xn = /^\d+$/.test(x);
    const yn = /^\d+$/.test(y);
    if (xn && yn) return Number(x) < Number(y) ? -1 : 1;
    if (xn !== yn) return xn ? -1 : 1;
    return x < y ? -1 : 1;
  }
  return 0;
}

const META_RE = /<!--\s*ig-release-meta:(\{[\s\S]*?\})\s*-->/;
const LEVELS: UpgradeLevel[] = ["routine", "attention", "breaking"];

/** Pull the `## What to expect` section and the machine-readable meta out of a body. */
export function parseReleaseBody(body: string): Pick<
  ReleaseInfo,
  "upgrade" | "schema" | "env" | "compose" | "whatToExpect" | "notes"
> {
  const text = body.replace(/\r\n/g, "\n");
  let upgrade: UpgradeLevel = "unknown";
  let schema: boolean | null = null;
  let env: boolean | null = null;
  let compose: boolean | null = null;

  const meta = META_RE.exec(text);
  if (meta) {
    try {
      const j = JSON.parse(meta[1]) as Record<string, unknown>;
      if (LEVELS.includes(j.upgrade as UpgradeLevel)) {
        upgrade = j.upgrade as UpgradeLevel;
        schema = j.schema === true;
        env = j.env === true;
        compose = j.compose === true;
      }
    } catch {
      // Malformed meta is treated like no meta.
    }
  }

  const clean = text.replace(/<!--[\s\S]*?-->/g, "").trim();
  const sec = /^##[ \t]+What to expect[ \t]*\n([\s\S]*?)(?=^##[ \t]|(?![\s\S]))/im.exec(clean);
  const whatToExpect = sec?.[1].trim() || null;

  return {
    upgrade,
    schema,
    env,
    compose,
    whatToExpect,
    notes: clean.length > MAX_NOTES ? `${clean.slice(0, MAX_NOTES).trimEnd()}...` : clean,
  };
}

/**
 * Turn the GitHub releases list into the response body. Drafts, prereleases
 * and any tag with a prerelease suffix (-beta.N) are ignored. An unparseable
 * `current` (dev build) never reports an update.
 */
export function buildUpdateInfo(
  currentVersion: string,
  releases: GithubRelease[],
  checkedAt: string,
): Extract<UpdatesResponse, { status: "ok" }> {
  const current = currentVersion.replace(/^v/, "");
  const cur = parseVersion(current);

  const stable: { sv: Semver; info: ReleaseInfo }[] = [];
  for (const r of releases) {
    if (r.draft === true || r.prerelease === true) continue;
    if (typeof r.tag_name !== "string") continue;
    const sv = parseVersion(r.tag_name);
    if (!sv || sv.pre.length) continue;
    const version = r.tag_name.replace(/^v/, "");
    stable.push({
      sv,
      info: {
        version,
        name: typeof r.name === "string" && r.name ? r.name : `v${version}`,
        publishedAt: typeof r.published_at === "string" ? r.published_at : null,
        url: typeof r.html_url === "string" ? r.html_url : "",
        ...parseReleaseBody(typeof r.body === "string" ? r.body : ""),
      },
    });
  }
  stable.sort((a, b) => compareSemver(b.sv, a.sv));

  const missed = cur ? stable.filter((s) => compareSemver(s.sv, cur) > 0).map((s) => s.info) : [];
  const top = stable[0]?.info ?? null;

  return {
    status: "ok",
    current,
    checkedAt,
    latest: top && {
      version: top.version,
      publishedAt: top.publishedAt,
      url: top.url,
      name: top.name,
    },
    updateAvailable: missed.length > 0,
    missed,
  };
}

/** Highest upgrade level across a set of releases (breaking > attention > routine > unknown). */
export function worstLevel(releases: Pick<ReleaseInfo, "upgrade">[]): UpgradeLevel {
  const order: UpgradeLevel[] = ["unknown", "routine", "attention", "breaking"];
  return releases.reduce<UpgradeLevel>(
    (w, r) => (order.indexOf(r.upgrade) > order.indexOf(w) ? r.upgrade : w),
    "unknown",
  );
}
