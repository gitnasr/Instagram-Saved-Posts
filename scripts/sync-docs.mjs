import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const srcDocsDir = path.join(rootDir, "docs");

const targetCandidates = [
  process.env.LANDING_DOCS_DIR,
  path.resolve(rootDir, "../instagram-saved-posts-landing/content/docs"),
  path.resolve("G:/Coding/Programming/Projects/IGSP/instagram-saved-posts-landing/content/docs"),
].filter(Boolean);

let targetDocsDir = targetCandidates.find((dir) => {
  try {
    return fs.existsSync(path.dirname(dir));
  } catch {
    return false;
  }
});

if (!targetDocsDir) {
  console.error("Error: Could not locate instagram-saved-posts-landing content/docs directory.");
  process.exit(1);
}

console.log(`Syncing documentation...`);
console.log(`  Source: ${srcDocsDir}`);
console.log(`  Target: ${targetDocsDir}`);

// Clean old files in target to avoid orphaned docs
if (fs.existsSync(targetDocsDir)) {
  fs.rmSync(targetDocsDir, { recursive: true, force: true });
}
fs.mkdirSync(targetDocsDir, { recursive: true });

// Copy all docs recursively
fs.cpSync(srcDocsDir, targetDocsDir, { recursive: true, force: true });

console.log("Documentation successfully synced to landing page!");
