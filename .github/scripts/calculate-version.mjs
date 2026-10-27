import fs from "node:fs";
import { execSync } from "node:child_process";
import { changedFiles, decideBump, readCommits } from "./release-lib.mjs";

// Determine mode: 'release' (default) or 'beta' (for PRs)
const args = process.argv.slice(2);
const modeArg = args.find((a) => a.startsWith("--mode="))?.split("=")[1];
const mode = (modeArg || process.env.INPUT_MODE || process.env.MODE || "release").toLowerCase();

const isTagPush = process.env.IS_TAG_PUSH === "true" || (process.env.GITHUB_REF || "").startsWith("refs/tags/v");
const dryRun = process.env.INPUT_DRY_RUN === "true";
const bumpType = process.env.INPUT_BUMP_TYPE || "auto";
const customInput = (process.env.INPUT_CUSTOM_VERSION || "")
  .trim()
  .replace(/^v/, "");

// Helper to run git commands safely
function runGit(cmd) {
  try {
    return execSync(cmd, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

// 1. Determine base version from latest tag and/or package.json
// Stable vX.Y.Z tags only (betas are never git tags, but be explicit).
let latestTag = runGit('git describe --tags --abbrev=0 --match "v[0-9]*.[0-9]*.[0-9]*" --exclude "*-*"');
let latestTagVersion = latestTag.replace(/^v/, "");

let pkgVersion = "1.0.0";
try {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  pkgVersion = (pkg.version || "1.0.0").replace(/^v/, "");
} catch {}

function parseSemver(v) {
  const [semverPart] = v.split("-");
  let [major, minor, patch] = (semverPart || "1.0.0").split(".").map(Number);
  if (isNaN(major)) major = 1;
  if (isNaN(minor)) minor = 0;
  if (isNaN(patch)) patch = 0;
  return { major, minor, patch };
}

// Choose highest base version between latest tag and package.json
const tagSemver = parseSemver(latestTagVersion);
const pkgSemver = parseSemver(pkgVersion);

let baseMajor = Math.max(tagSemver.major, pkgSemver.major);
let baseMinor =
  tagSemver.major > pkgSemver.major
    ? tagSemver.minor
    : pkgSemver.major > tagSemver.major
    ? pkgSemver.minor
    : Math.max(tagSemver.minor, pkgSemver.minor);
let basePatch =
  tagSemver.major === pkgSemver.major && tagSemver.minor === pkgSemver.minor
    ? Math.max(tagSemver.patch, pkgSemver.patch)
    : tagSemver.major > pkgSemver.major || (tagSemver.major === pkgSemver.major && tagSemver.minor > pkgSemver.minor)
    ? tagSemver.patch
    : pkgSemver.patch;

// 2. Smart bump decision from commits + changed files since the last tag.
// Rules live in release-lib.mjs (decideBump) and CONTRIBUTING.md.
const range = latestTag ? `${latestTag}..HEAD` : "HEAD";
let decision = { bump: "patch", reasons: ["could not read git history"] };
try {
  decision = decideBump(readCommits(range), latestTag ? changedFiles(latestTag, "HEAD") : null);
} catch (err) {
  console.warn(`Warning: smart bump unavailable (${err.message}); falling back to patch`);
}
// Nothing user-relevant to ship: auto mode skips the release (manual overrides still release).
const autoSkip = decision.bump === "none";

// Target release version calculation
let targetReleaseVersion = "";
if (isTagPush) {
  const rawTag = (process.env.GITHUB_REF || "").replace("refs/tags/", "");
  targetReleaseVersion = rawTag.replace(/^v/, "");
} else if (bumpType === "custom") {
  if (!customInput) {
    console.error('Error: custom_version is required when bump_type is "custom"');
    process.exit(1);
  }
  targetReleaseVersion = customInput;
} else if (bumpType === "major") {
  targetReleaseVersion = `${baseMajor + 1}.0.0`;
} else if (bumpType === "minor") {
  targetReleaseVersion = `${baseMajor}.${baseMinor + 1}.0`;
} else if (bumpType === "patch") {
  targetReleaseVersion = `${baseMajor}.${baseMinor}.${basePatch + 1}`;
} else {
  // auto mode
  console.log(`Smart bump: ${decision.bump} (${decision.reasons.join("; ")})`);
  if (decision.bump === "major") {
    targetReleaseVersion = `${baseMajor + 1}.0.0`;
  } else if (decision.bump === "minor") {
    targetReleaseVersion = `${baseMajor}.${baseMinor + 1}.0`;
  } else {
    targetReleaseVersion = `${baseMajor}.${baseMinor}.${basePatch + 1}`;
  }
}

const rawRepo = process.env.GITHUB_REPOSITORY || "gitnasr/instagram-saved-posts";
const imageName = rawRepo.toLowerCase();

let finalVersion = "";
let finalTag = "";
let shouldRelease = true;
let prNumber = "";

if (mode === "beta") {
  // Extract PR number from environment
  prNumber =
    process.env.GITHUB_PR_NUMBER ||
    process.env.PR_NUMBER ||
    "";

  if (!prNumber && process.env.GITHUB_REF) {
    const prMatch = process.env.GITHUB_REF.match(/refs\/pull\/(\d+)\//);
    if (prMatch) {
      prNumber = prMatch[1];
    }
  }

  if (!prNumber) {
    prNumber = process.env.GITHUB_RUN_NUMBER || "pr";
  }

  finalVersion = `${targetReleaseVersion}-beta.${prNumber}`;
  finalTag = `v${finalVersion}`;
  shouldRelease = true;

  console.log("==========================================");
  console.log("🧪 CI/CD BETA VERSION CALCULATION");
  console.log(`📦 Target Base Version:   ${targetReleaseVersion}`);
  console.log(`🔢 PR Number:             ${prNumber}`);
  console.log(`🚀 Calculated Beta Ver:   ${finalVersion}`);
  console.log(`🏷️ Beta Tag:              ${finalTag}`);
  console.log(`🐳 Image Name:            ${imageName}`);
  console.log("==========================================");
} else {
  // Production Release mode
  finalVersion = targetReleaseVersion;
  finalTag = `v${finalVersion}`;

  // Check if HEAD is already tagged with exact release tag
  const exactHeadTag = runGit("git describe --tags --exact-match HEAD");
  if (exactHeadTag && exactHeadTag === finalTag && !isTagPush && bumpType === "auto") {
    console.log(`ℹ️ Current HEAD is already tagged as ${exactHeadTag}. No new release needed.`);
    shouldRelease = false;
  }
  if (autoSkip && !isTagPush && bumpType === "auto") {
    console.log(`ℹ️ ${decision.reasons.join("; ")}. No release needed.`);
    shouldRelease = false;
  }

  const { major, minor } = parseSemver(finalVersion);

  console.log("==========================================");
  console.log("🚀 CI/CD PRODUCTION RELEASE CALCULATION");
  console.log(`📦 Calculated Version:    ${finalVersion}`);
  console.log(`🏷️ Release Tag:           ${finalTag}`);
  console.log(`🔖 Major/Minor:           v${major}.${minor}, v${major}`);
  console.log(`🐳 Image Name:            ${imageName}`);
  console.log(`✨ Should Release:        ${shouldRelease}`);
  console.log(`🧪 Dry Run Mode:          ${dryRun}`);
  console.log("==========================================");
}

const { major, minor, patch } = parseSemver(finalVersion);

if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `version=${finalVersion}\n`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `tag=${finalTag}\n`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `major=${major}\n`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `minor=${major}.${minor}\n`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `patch=${patch}\n`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `image_name=${imageName}\n`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `should_release=${shouldRelease}\n`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `is_tag_push=${isTagPush}\n`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `dry_run=${dryRun}\n`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `mode=${mode}\n`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `bump=${decision.bump}\n`);
  if (prNumber) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `pr_number=${prNumber}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `pr_tag=beta-pr-${prNumber}\n`);
  }
}
