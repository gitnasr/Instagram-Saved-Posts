// Writes the GitHub Release body (see wiki/release-contract.md).
// Usage: node .github/scripts/generate-release-notes.mjs <prevTag|""> <newTagOrRef> [--out=notes.md] [--repo=owner/name]
// Node builtins only: this runs in CI without npm install.
import fs from "node:fs";
import { buildNotes, changedFiles, readCommits } from "./release-lib.mjs";

const args = process.argv.slice(2);
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
const [prevArg = "", tag = "HEAD"] = args.filter((a) => !a.startsWith("--"));
const prev = prevArg.trim();
const out = flag("out") || "release-notes.md";
const repo = flag("repo") || process.env.GITHUB_REPOSITORY || "gitnasr/Instagram-Saved-Posts";

const commits = readCommits(prev ? `${prev}..${tag}` : tag);
const files = prev ? changedFiles(prev, tag) : [];
const notes = buildNotes(commits, { repo, prev, tag, files });

fs.writeFileSync(out, notes);
console.log(`Wrote ${out} (${commits.length} commits, ${prev || "start"}..${tag})`);
