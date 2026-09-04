// Env comes from `tsx --env-file-if-exists=.env` (see the reindex:vectors script).
import { PrismaClient } from "@prisma/client";
import { runVectorIndex, getCurrentIndexState } from "../src/lib/vector/index-posts";

function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  return idx !== -1 ? process.argv[idx + 1] : undefined;
}

async function main() {
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
    console.log("[reindex-vectors] Done:", state);
    if (state?.status === "failed" || (state?.failedItems ?? 0) > 0) process.exitCode = 1;
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("[reindex-vectors] Failed:", err);
  process.exit(1);
});
