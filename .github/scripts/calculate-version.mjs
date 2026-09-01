import fs from "node:fs";
import { execSync } from "node:child_process";

const isTagPush = process.env.IS_TAG_PUSH === "true";
const dryRun = process.env.INPUT_DRY_RUN === "true";
const bumpType = process.env.INPUT_BUMP_TYPE || "auto";
const customInput = (process.env.INPUT_CUSTOM_VERSION || "")
  .trim()
  .replace(/^v/, "");

let nextVersion = "";

if (isTagPush) {
  const rawTag = (process.env.GITHUB_REF || "").replace("refs/tags/", "");
  nextVersion = rawTag.replace(/^v/, "");
} else if (bumpType === "custom") {
  if (!customInput) {
    console.error('Error: custom_version is required when bump_type is "custom"');
    process.exit(1);
  }
  nextVersion = customInput;
} else {
  let pkgVersion = "1.0.0";
  try {
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
    pkgVersion = pkg.version || "1.0.0";
  } catch {}

  let [major, minor, patch] = pkgVersion
    .replace(/^v/, "")
    .split(".")
    .map(Number);
  if (isNaN(major)) major = 1;
  if (isNaN(minor)) minor = 0;
  if (isNaN(patch)) patch = 0;

  if (bumpType === "major") {
    nextVersion = `${major + 1}.0.0`;
  } else if (bumpType === "minor") {
    nextVersion = `${major}.${minor + 1}.0`;
  } else if (bumpType === "patch") {
    nextVersion = `${major}.${minor}.${patch + 1}`;
  } else {
    // 'auto' mode: analyze commit messages since the last git tag
    let latestTag = "";
    try {
      latestTag = execSync("git describe --tags --abbrev=0", {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "ignore"],
      }).trim();
    } catch {}

    let logRange = latestTag ? `${latestTag}..HEAD` : "HEAD";
    let logs = "";
    try {
      logs = execSync(`git log ${logRange} --pretty=format:"%s"`, {
        encoding: "utf8",
      });
    } catch {
      logs = execSync('git log -n 50 --pretty=format:"%s"', {
        encoding: "utf8",
      });
    }

    const lines = logs.split("\n").filter(Boolean);
    const hasBreaking = lines.some(
      (l) =>
        l.includes("BREAKING CHANGE") ||
        /^[a-z]+(\([^\)]+\))?!:/.test(l)
    );
    const hasFeature = lines.some((l) => /^feat(\([^\)]+\))?:/i.test(l));

    if (hasBreaking) {
      nextVersion = `${major + 1}.0.0`;
    } else if (hasFeature) {
      nextVersion = `${major}.${minor + 1}.0`;
    } else {
      nextVersion = `${major}.${minor}.${patch + 1}`;
    }
  }
}

const tag = `v${nextVersion}`;
const rawRepo = process.env.GITHUB_REPOSITORY || "gitnasr/instagram-saved-posts";
const imageName = rawRepo.toLowerCase();

console.log("==========================================");
console.log(`📦 Calculated Next Version: ${nextVersion}`);
console.log(`🏷️ Release Tag:             ${tag}`);
console.log(`🐳 Image Name:              ${imageName}`);
console.log(`🧪 Dry Run Mode:            ${dryRun}`);
console.log("==========================================");

if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `version=${nextVersion}\n`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `tag=${tag}\n`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `image_name=${imageName}\n`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `is_tag_push=${isTagPush}\n`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `dry_run=${dryRun}\n`);
}
