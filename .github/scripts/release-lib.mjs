// Shared, pure release logic: commit classification, bump decision, release notes.
// Used by calculate-version.mjs and generate-release-notes.mjs; unit-tested in
// release.test.mjs. Node builtins only (these scripts run in CI without npm install).
// Rules are documented for contributors in CONTRIBUTING.md ("Commit messages & releases").
import { execFileSync } from "node:child_process";

export const DOCS_URL = "https://insta-saved.gitnasr.com/docs/operations/updating";

// --- file signals ---------------------------------------------------------

// Files that never change what a user runs. Everything else (src/, prisma/,
// Dockerfile, compose files, package*.json, scripts/, ...) counts as functional.
const NON_FUNCTIONAL = [
  /^(\.github|\.agents|\.claude|docs|wiki)\//,
  /\.mdx?$/i,
  /^(LICENSE|\.gitignore|\.gitattributes|\.editorconfig|knip\.json)$/,
];
export const isFunctional = (file) => !NON_FUNCTIONAL.some((re) => re.test(file));

export const COMPOSE_RE = /(^|\/)docker-compose[^/]*\.ya?ml$|-compose\.ya?ml$/;

export function fileFlags(files) {
  return {
    schema: files.includes("prisma/schema.prisma"),
    env: files.includes(".env.example"),
    compose: files.some((f) => COMPOSE_RE.test(f)),
  };
}

// --- commit classification ------------------------------------------------

const CONVENTIONAL = /^([a-z]+)(?:\(([^)]*)\))?(!)?:\s*(.+)$/i;
const TYPE_CATEGORY = {
  feat: "feature", fix: "fix", perf: "perf", docs: "docs",
  refactor: "internal", chore: "internal", ci: "internal", build: "internal",
  test: "internal", style: "internal", revert: "internal",
};

// Leading-verb heuristic for non-conventional subjects ("Add X", "Fix Y").
// Deliberately small; anything else is "internal" unless it touches UI code (see classify).
const FEATURE_VERBS = ["add", "introduce", "implement", "support", "enable", "allow", "create"];
const FIX_VERBS = ["fix", "resolve", "prevent", "handle", "correct", "repair"];
const PERF_RE = /\b(faster|speed(s|ed)? up|optimi[sz]\w*|incremental(ly)?|performance)\b/i;
const FIX_WORD_RE = /\b(bug|crash(es)?|regression)\b/i;
const DOCS_VERBS = ["document"];

// Imperative -> past tense for the common verbs; others keep their imperative form.
const PAST = {
  add: "Added", fix: "Fixed", remove: "Removed", make: "Made", open: "Opened",
  update: "Updated", improve: "Improved", persist: "Persisted", mark: "Marked",
  backfill: "Backfilled", show: "Showed", use: "Used", replace: "Replaced",
  prevent: "Prevented", handle: "Handled", resolve: "Resolved", implement: "Implemented",
  introduce: "Introduced", enable: "Enabled", allow: "Allowed", create: "Created",
  restore: "Restored", move: "Moved", rename: "Renamed", change: "Changed",
  support: "Supported", correct: "Corrected", repair: "Repaired", polish: "Polished",
  enhance: "Enhanced", refactor: "Refactored", prototype: "Prototyped", document: "Documented",
};

const isRelease = (subject) => /^chore\(release\)/i.test(subject);
const isDependabot = (c) =>
  /dependabot/i.test(c.author || "") || /^(build|chore)\(deps[^)]*\)/i.test(c.subject) || /^Bump /.test(c.subject);

export function releaseNote(body) {
  const m = /^Release-Note:[ \t]*(.+)$/im.exec(body || "");
  return m ? m[1].trim() : "";
}

function humanize(desc) {
  const text = desc.replace(/\.$/, "").trim();
  const [first, ...rest] = text.split(/\s+/);
  const past = PAST[first.toLowerCase()];
  const out = past ? [past, ...rest].join(" ") : text;
  return out.charAt(0).toUpperCase() + out.slice(1);
}

// commit: { hash, author, subject, body, files } (files may be undefined if unknown)
export function classify(commit) {
  const subject = (commit.subject || "").trim();
  const body = commit.body || "";
  const out = { hash: commit.hash, skip: false, category: "internal", breaking: false, functional: true, text: "", pr: "" };

  if (!subject || isRelease(subject) || /^Merge /.test(subject)) return { ...out, skip: true };

  const pr = /\s*\(#(\d+)\)\s*$/.exec(subject);
  out.pr = pr ? pr[1] : "";
  const clean = subject.replace(/\s*\(#\d+\)\s*$/, "");

  const conv = CONVENTIONAL.exec(clean);
  const isConv = conv && TYPE_CATEGORY[conv[1].toLowerCase()];
  const desc = isConv ? conv[4] : clean;
  const firstWord = desc.split(/\s+/)[0].toLowerCase();

  out.breaking =
    Boolean(isConv && conv[3]) || /BREAKING[ -]CHANGE/.test(subject) || /^BREAKING[ -]CHANGE:/m.test(body);

  if (isDependabot(commit)) out.category = "deps";
  else if (isConv) out.category = TYPE_CATEGORY[conv[1].toLowerCase()];
  else if (FEATURE_VERBS.includes(firstWord)) out.category = "feature";
  else if (FIX_VERBS.includes(firstWord) || FIX_WORD_RE.test(desc)) out.category = "fix";
  else if (PERF_RE.test(desc)) out.category = "perf";
  else if (DOCS_VERBS.includes(firstWord)) out.category = "docs";

  const files = commit.files;
  if (files && files.length) {
    out.functional = files.some(isFunctional);
    // A commit that only touches docs/CI cannot be a user-facing feature/fix/perf.
    if (!out.functional && ["feature", "fix", "perf"].includes(out.category)) out.category = "internal";
    // Non-conventional, unrecognised verb, but it changes UI code: surface it in Highlights.
    if (!isConv && out.category === "internal" && files.some((f) => /^src\/(components|app(?!\/api))\//.test(f))) {
      out.category = "feature";
      out.weak = true; // shown in Highlights but does not trigger a minor bump
    }
    if (!out.functional && !isDependabot(commit) && files.every((f) => /\.mdx?$|^docs\//i.test(f))) out.category = "docs";
  }

  const note = releaseNote(body);
  if (/^(skip|none|n\/a)$/i.test(note)) return { ...out, skip: true };
  out.text = note || humanize(desc);
  out.hasNote = Boolean(note);
  return out;
}

// --- bump decision --------------------------------------------------------

// commits: raw commits since the last tag; files: `git diff --name-only <tag>..HEAD`
// (array) or null when unknown (no tag yet => assume functional).
// Returns { bump: 'major'|'minor'|'patch'|'none', reasons: string[] }.
export function decideBump(commits, files) {
  const live = commits.map(classify).filter((c) => !c.skip);
  if (!commits.length) return { bump: "none", reasons: ["no commits since last tag"] };
  if (files && !files.some(isFunctional)) {
    return { bump: "none", reasons: ["only docs/CI/meta files changed"] };
  }
  const relevant = live.filter((c) => c.functional);
  const breaking = relevant.filter((c) => c.breaking);
  if (breaking.length) return { bump: "major", reasons: breaking.map((c) => `breaking: ${c.text}`) };
  const feats = relevant.filter((c) => c.category === "feature" && !c.weak);
  if (feats.length) return { bump: "minor", reasons: feats.map((c) => `feature: ${c.text}`) };
  return { bump: "patch", reasons: [`${relevant.length} functional change(s), no feature/breaking marker`] };
}

// --- release notes --------------------------------------------------------

const SECTIONS = [
  ["feature", "Highlights"],
  ["fix", "Fixes"],
  ["perf", "Performance"],
  ["internal", "Under the hood"],
  ["docs", "Docs"],
];

const VERDICT = {
  routine: "**Safe to update.** Pull the new image and restart. No config or database changes.",
  attention: "**Update with a quick check.** Read the points below before restarting.",
  breaking: "**Breaking release.** Read the points below before updating; a plain restart may not be enough.",
};

export function upgradeLevel(breaking, flags) {
  if (breaking) return "breaking";
  return flags.schema || flags.env || flags.compose ? "attention" : "routine";
}

export function bumpBetween(prev, next) {
  const p = /^v?(\d+)\.(\d+)\.(\d+)/.exec(prev || "");
  const n = /^v?(\d+)\.(\d+)\.(\d+)/.exec(next || "");
  if (!p || !n) return null;
  if (n[1] !== p[1]) return "major";
  if (n[2] !== p[2]) return "minor";
  return "patch";
}

// opts: { repo, prev, tag, files, bump? }
export function buildNotes(commits, opts) {
  const { repo, prev, tag } = opts;
  const files = opts.files || [];
  const link = (c) =>
    c.pr
      ? `[#${c.pr}](https://github.com/${repo}/pull/${c.pr})`
      : `[\`${c.hash.slice(0, 7)}\`](https://github.com/${repo}/commit/${c.hash})`;

  const items = commits.map((c) => ({ ...classify(c), hash: c.hash })).filter((c) => !c.skip);
  const flags = fileFlags(files);
  const breaking = items.filter((c) => c.breaking);
  const upgrade = upgradeLevel(breaking.length > 0, flags);
  const bump = bumpBetween(prev, tag) || opts.bump || decideBump(commits, files).bump;

  const expect = [VERDICT[upgrade]];
  const bullets = [];
  breaking.forEach((c) => bullets.push(`Breaking: ${c.text} (${link(c)})`));
  if (flags.schema) bullets.push("The database schema changed (`prisma/schema.prisma`). Back up your database before updating.");
  if (flags.env) bullets.push("`.env.example` changed. Compare it with your `.env` for new or renamed variables.");
  if (flags.compose) bullets.push("A Docker Compose file changed. Re-download or merge it into your own compose file before `docker compose up -d`.");

  const out = ["## What to expect", "", ...expect, ""];
  if (bullets.length) out.push(...bullets.map((b) => `- ${b}`), "");

  for (const [cat, title] of SECTIONS) {
    const rows = items.filter((c) => c.category === cat);
    if (!rows.length) continue;
    out.push(`## ${title}`, "", ...rows.map((c) => `- ${c.text} (${link(c)})`), "");
  }
  const deps = items.filter((c) => c.category === "deps");
  if (deps.length) {
    out.push(
      `<details><summary>Dependencies (${deps.length} update${deps.length > 1 ? "s" : ""})</summary>`,
      "",
      ...deps.map((c) => `- ${c.text} (${link(c)})`),
      "",
      "</details>",
      "",
    );
  }
  if (!items.length) out.push("No user-facing changes recorded for this release.", "");

  if (prev) out.push(`**Full changelog**: https://github.com/${repo}/compare/${prev}...${tag}`, "");
  out.push(
    "## Upgrade",
    "",
    "```bash",
    "docker compose pull && docker compose up -d",
    "```",
    "",
    `Docs: [Updating & Releases](${DOCS_URL})`,
    "",
  );
  const meta = { v: 1, bump, upgrade, ...flags };
  out.push(`<!-- ig-release-meta:${JSON.stringify(meta)} -->`);
  return out.join("\n") + "\n";
}

// --- git readers (only the CLIs call these) -------------------------------

const git = (args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

export function readCommits(range) {
  const sep = "\x1e";
  const raw = git(["log", "--no-merges", range, `--format=${sep}%H\x1f%an\x1f%s\x1f%b\x1f`, "--name-only"]);
  return raw
    .split(sep)
    .filter((r) => r.trim())
    .map((r) => {
      const [hash, author, subject, body, rest = ""] = r.split("\x1f");
      return {
        hash: hash.trim(), author, subject, body,
        files: rest.split("\n").map((f) => f.trim()).filter(Boolean),
      };
    });
}

export function changedFiles(from, to) {
  return git(["diff", "--name-only", `${from}..${to}`]).split("\n").map((f) => f.trim()).filter(Boolean);
}
