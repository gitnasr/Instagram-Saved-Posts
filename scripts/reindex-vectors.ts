/**
 * One-time / on-demand: embed post + carousel thumbnails (CLIP + face
 * descriptors) and upsert them into Qdrant.
 *
 *   npm run reindex:vectors -- --profile <profileId>
 *   npm run reindex:vectors -- --all
 *
 * Safe to run repeatedly: point ids are deterministic (see
 * src/lib/vector/qdrant-client.ts pointId()), so re-running upserts in place.
 */
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

// ── Minimal .env loader (no extra deps) — matches scripts/backfill-mongo.ts ──
function loadDotEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2];
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  return idx !== -1 ? process.argv[idx + 1] : undefined;
}

loadDotEnv();

async function main() {
  // Imported after loadDotEnv() so QDRANT_URL/DATABASE_URL are set before
  // these modules read process.env at call time.
  const { runVectorIndex, getCurrentIndexState } = await import("../src/lib/vector/index-posts");

  const prisma = new PrismaClient();
  const profileArg = getArg("profile");
  const all = process.argv.includes("--all");

  if (!profileArg && !all) {
    console.error("Usage: npm run reindex:vectors -- --profile <profileId>  OR  --all");
    process.exit(1);
  }

  const profiles = all
    ? await prisma.profile.findMany({ select: { id: true, name: true } })
    : [{ id: profileArg!, name: profileArg! }];

  for (const profile of profiles) {
    console.log(`\n[reindex-vectors] Indexing profile ${profile.name} (${profile.id})...`);
    await runVectorIndex(profile.id);
    const state = getCurrentIndexState(profile.id);
    console.log(`[reindex-vectors] Done:`, state);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("[reindex-vectors] Failed:", err);
  process.exit(1);
});
