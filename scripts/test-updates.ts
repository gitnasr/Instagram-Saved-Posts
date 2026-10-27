// Self-check for src/lib/updates.ts. Run: npx tsx scripts/test-updates.ts
import assert from "node:assert/strict";
import { buildUpdateInfo, compareSemver, parseReleaseBody, parseVersion, worstLevel } from "../src/lib/updates";

const cmp = (a: string, b: string) => compareSemver(parseVersion(a)!, parseVersion(b)!);
assert.equal(cmp("1.3.12", "1.3.2"), 1);
assert.equal(cmp("1.4.0-beta.5", "1.4.0"), -1);
assert.equal(cmp("1.4.0-beta.5", "1.4.0-beta.10"), -1);
assert.equal(cmp("1.4.0-beta.1", "1.3.12"), 1);
assert.equal(cmp("v2.0.0", "2.0.0"), 0);
assert.equal(parseVersion("dev"), null);
assert.equal(parseVersion(""), null);

const meta = (u: string) =>
  `<!-- ig-release-meta:{"v":1,"bump":"minor","upgrade":"${u}","schema":true,"env":false,"compose":false} -->`;
const rel = (tag: string, body = "", extra: object = {}) => ({
  tag_name: tag, name: tag, body, html_url: `https://x/${tag}`, published_at: "2026-01-01T00:00:00Z", ...extra,
});
const body = `## What to expect\nSafe to update.\n- No config changes.\n\n## Highlights\n- thing\n\n${meta("attention")}`;

const p = parseReleaseBody(body);
assert.equal(p.upgrade, "attention");
assert.equal(p.schema, true);
assert.equal(p.whatToExpect, "Safe to update.\n- No config changes.");
assert.ok(!p.notes.includes("ig-release-meta"));

const old = parseReleaseBody("## Changes\n- old style\r\n");
assert.equal(old.upgrade, "unknown");
assert.equal(old.whatToExpect, null);
assert.equal(old.schema, null);
assert.equal(parseReleaseBody("<!-- ig-release-meta:{bad} -->").upgrade, "unknown");
// What to expect as the last section, no meta
assert.equal(parseReleaseBody("## What to expect\nHeads up.").whatToExpect, "Heads up.");

const list = [
  rel("v1.4.0-beta.2"), rel("v1.3.13", body), rel("v1.3.12"), rel("v1.3.14", "", { draft: true }),
  rel("v1.5.0", "", { prerelease: true }), rel("v1.3.11"), rel("not-a-version"),
];
const r = buildUpdateInfo("1.3.11", list, "t");
assert.equal(r.updateAvailable, true);
assert.deepEqual(r.missed.map((m) => m.version), ["1.3.13", "1.3.12"]);
assert.equal(r.latest?.version, "1.3.13");
assert.equal(worstLevel(r.missed), "attention");

assert.equal(buildUpdateInfo("1.3.13", list, "t").updateAvailable, false);
assert.equal(buildUpdateInfo("1.4.0-beta.5", list, "t").updateAvailable, false); // beta of 1.4.0 vs 1.3.13
assert.equal(buildUpdateInfo("1.3.13-beta.1", list, "t").updateAvailable, true); // beta of 1.3.13 < 1.3.13
assert.equal(buildUpdateInfo("dev", list, "t").updateAvailable, false);
assert.equal(buildUpdateInfo("", [], "t").latest, null);

console.log("updates: all checks passed");
assert.equal(parseReleaseBody("<!-- Release notes generated -->\n\n**Full Changelog**: x").notes, "**Full Changelog**: x");
