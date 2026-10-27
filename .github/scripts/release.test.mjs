// Run: node --test ".github/scripts/*.test.mjs"   (no npm install needed)
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildNotes, classify, decideBump, fileFlags } from "./release-lib.mjs";

let n = 0;
const c = (subject, files = ["src/lib/x.ts"], extra = {}) => ({
  hash: String(++n).padStart(7, "0") + "abcdef",
  author: "dev",
  subject,
  body: "",
  files,
  ...extra,
});
const SRC = ["src/lib/x.ts"];
const bump = (commits, files = SRC) => decideBump(commits, files).bump;

test("bump: conventional breaking (!) is major", () => {
  assert.equal(bump([c("feat!: drop old API"), c("fix: y")]), "major");
});
test("bump: BREAKING CHANGE in body is major", () => {
  assert.equal(bump([c("Rework storage", SRC, { body: "BREAKING CHANGE: needs reindex" })]), "major");
});
test("bump: BREAKING CHANGE in subject is major", () => {
  assert.equal(bump([c("refactor: BREAKING CHANGE config renamed")]), "major");
});
test("bump: feat is minor, fix is patch", () => {
  assert.equal(bump([c("feat: new thing (#4)"), c("fix: bug")]), "minor");
  assert.equal(bump([c("fix: bug")]), "patch");
});
test("bump: docs/CI/meta-only changes => no release", () => {
  const files = ["README.md", "docs/a.md", ".github/workflows/ci.yml", "AGENTS.md"];
  const r = decideBump([c("feat: add release workflow", files), c("docs: x", ["docs/a.md"])], files);
  assert.equal(r.bump, "none");
});
test("bump: docs-only feat commit does not trigger minor when src also changed", () => {
  assert.equal(bump([c("feat: ci thing", [".github/a.yml"]), c("Tweak spacing", SRC)], [".github/a.yml", ...SRC]), "patch");
});
test("bump: no commits since tag => none", () => {
  assert.equal(bump([], []), "none");
});
test("bump: non-conventional verbs", () => {
  assert.equal(bump([c("Add dark mode")]), "minor");
  assert.equal(bump([c("Introduce vector search")]), "minor");
  assert.equal(bump([c("Fix crash on empty feed")]), "patch");
  assert.equal(bump([c("Remove the Auto Flip")]), "patch");
  assert.equal(bump([c("Open account profiles in a new tab")]), "patch");
});
test("bump: UI-only unknown-verb change is shown in Highlights but stays patch", () => {
  const ui = c("Open profiles in a new tab", ["src/components/a.tsx"]);
  assert.equal(classify(ui).category, "feature");
  assert.equal(bump([ui], ["src/components/a.tsx"]), "patch");
});
test("bump: chore(release) and merge commits are ignored", () => {
  assert.equal(bump([c("chore(release): v1.3.12 [skip ci]", ["package.json"]), c("Merge branch 'master' of x"), c("fix: y")]), "patch");
  assert.equal(bump([c("chore(release): v2.0.0! [skip ci]", ["package.json"])], ["package.json"]), "patch");
});
test("bump: schema change alone never bumps major", () => {
  const files = ["prisma/schema.prisma"];
  assert.equal(bump([c("Change post model", files)], files), "patch");
});
test("bump: PR suffix is stripped before classification", () => {
  const r = classify(c("Add thing (#12)"));
  assert.equal(r.pr, "12");
  assert.equal(r.text, "Added thing");
});
test("bump: dependency bumps are patch, dependabot actions-only are no release", () => {
  assert.equal(bump([c("build(deps): bump next from 1 to 2", ["package.json"])], ["package.json"]), "patch");
  const files = [".github/workflows/ci.yml"];
  assert.equal(bump([c("build(deps): bump actions/cache from 4 to 6 (#28)", files)], files), "none");
});

const meta = (md) => {
  const last = md.trimEnd().split("\n").pop();
  const m = /^<!-- ig-release-meta:(.*) -->$/.exec(last);
  assert.ok(m, "last line is the meta comment");
  return JSON.parse(m[1]);
};
const notes = (commits, files, prev = "v1.0.0", tag = "v1.0.1") =>
  buildNotes(commits, { repo: "o/r", prev, tag, files });

test("notes: routine verdict, groups, links, upgrade section, meta", () => {
  const md = notes(
    [c("feat: add search (#3)"), c("fix(api): handle empty feed"), c("perf: make reindex incremental"), c("docs: update setup", ["docs/a.md"]), c("refactor: tidy", SRC), c("chore(release): v1.0.1 [skip ci]", ["package.json"])],
    SRC,
  );
  assert.match(md, /^## What to expect\n\n\*\*Safe to update/);
  for (const h of ["## Highlights", "## Fixes", "## Performance", "## Under the hood", "## Docs", "## Upgrade"]) assert.ok(md.includes(h), h);
  assert.ok(md.includes("[#3](https://github.com/o/r/pull/3)"));
  assert.ok(md.includes("docker compose pull && docker compose up -d"));
  assert.ok(md.includes("https://insta-saved.gitnasr.com/docs"));
  assert.ok(!md.includes("chore(release)") && !md.includes("v1.0.1 [skip"));
  assert.deepEqual(meta(md), { v: 1, bump: "patch", upgrade: "routine", schema: false, env: false, compose: false });
});
test("notes: attention verdict for schema/env/compose flags", () => {
  const files = ["prisma/schema.prisma", ".env.example", "dokploy-compose.yml", "src/a.ts"];
  const md = notes([c("fix: x")], files);
  assert.match(md, /Update with a quick check/);
  assert.deepEqual(meta(md), { v: 1, bump: "patch", upgrade: "attention", schema: true, env: true, compose: true });
});
test("notes: breaking verdict wins and lists the breaking change", () => {
  const md = notes([c("feat!: rename env vars")], [".env.example", ...SRC], "v1.0.0", "v2.0.0");
  assert.match(md, /Breaking release/);
  assert.match(md, /- Breaking: Renamed env vars/);
  assert.deepEqual(meta(md), { v: 1, bump: "major", upgrade: "breaking", schema: false, env: true, compose: false });
});
test("notes: Release-Note trailer overrides subject; 'skip' hides the commit", () => {
  const md = notes(
    [c("fix: internal wording", SRC, { body: "details\n\nRelease-Note: Scrapes no longer stall on private accounts" }), c("fix: hidden", SRC, { body: "Release-Note: skip" })],
    SRC,
  );
  assert.ok(md.includes("- Scrapes no longer stall on private accounts"));
  assert.ok(!md.includes("internal wording") && !md.includes("hidden"));
});
test("notes: dependabot noise collapses into one Dependencies block", () => {
  const md = notes([c("build(deps): bump a from 1 to 2 (#1)", ["package.json"]), c("Bump b from 1 to 2 (#2)", ["package.json"], { author: "dependabot[bot]" })], ["package.json"]);
  assert.equal(md.match(/<details>/g).length, 1);
  assert.match(md, /Dependencies \(2 updates\)/);
  assert.ok(!md.includes("## Under the hood"));
});
test("notes: bump comes from the tag versions (manual overrides)", () => {
  assert.equal(meta(notes([c("fix: x")], SRC, "v1.3.12", "v1.4.0")).bump, "minor");
});
test("fileFlags", () => {
  assert.deepEqual(fileFlags(["docker-compose.search.yml"]), { schema: false, env: false, compose: true });
});
