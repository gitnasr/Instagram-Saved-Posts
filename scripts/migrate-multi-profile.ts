/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * One-time, idempotent migration: single-account schema -> multi-profile.
 *
 *   npm run migrate:multiprofile            # dry run (counts + plan only)
 *   npm run migrate:multiprofile -- --confirm
 *
 * What it does (all via raw Mongo commands, so it is independent of which
 * Prisma client is generated):
 *   1. Backs up `accounts` and `posts` into *_backup_premultiprofile collections.
 *   2. Creates a Profile named "Sama" (idempotent), seeding its cookie /
 *      user-agent / lost-state-backfill flag from the existing global settings.
 *   3. Rewrites every `accounts` / `posts` doc: moves the old string `_id` into
 *      `pk` (and Post `id` -> `mediaId`), drops `_id` so Mongo mints a fresh
 *      ObjectId, and stamps `profileId`.
 *   4. Stamps `profileId` on carouselMedia / accountNotes / accountStatusHistory
 *      / accountUsernameHistory / scrapeRuns (no _id change).
 *
 * Safe to run repeatedly: each step is skipped when its target already carries
 * a `profileId`. RUN THIS BEFORE `prisma db push`.
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

const SAMA_NAME = "Sama";
const BACKUP_SUFFIX = "_backup_premultiprofile";
const STAMP_ONLY_COLLECTIONS = [
  "carouselMedia",
  "accountNotes",
  "accountStatusHistory",
  "accountUsernameHistory",
  "scrapeRuns",
];

// ── Minimal .env loader (no extra deps) ──────────────────────
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

const CONFIRM = process.argv.includes("--confirm");

/** Generate a syntactically valid 24-hex ObjectId string. */
function newObjectIdHex(): string {
  const ts = Math.floor(Date.now() / 1000)
    .toString(16)
    .padStart(8, "0");
  const rand = crypto.randomBytes(8).toString("hex"); // 16 hex chars
  return (ts + rand).slice(0, 24);
}

/** Extract a hex string from an _id that may be a string or `{ $oid }`. */
function idToHex(id: any): string {
  if (typeof id === "string") return id;
  if (id && typeof id.$oid === "string") return id.$oid;
  return String(id);
}

async function main() {
  loadDotEnv();
  if (!process.env.DATABASE_URL) {
    console.error("FATAL: DATABASE_URL is not set. Aborting.");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const run = (cmd: Record<string, any>) =>
    prisma.$runCommandRaw(cmd) as Promise<any>;

  const count = async (coll: string): Promise<number> => {
    try {
      const r = await run({ count: coll });
      return typeof r.n === "number" ? r.n : 0;
    } catch {
      return 0;
    }
  };

  const firstDoc = async (coll: string): Promise<any | null> => {
    const r = await run({ find: coll, limit: 1 });
    return r?.cursor?.firstBatch?.[0] ?? null;
  };

  const collectionExists = async (name: string): Promise<boolean> => {
    const r = await run({ listCollections: 1, filter: { name } });
    return (r?.cursor?.firstBatch?.length ?? 0) > 0;
  };

  try {
    console.log("── Multi-profile migration ──");
    const dataCollections = [
      "accounts",
      "posts",
      ...STAMP_ONLY_COLLECTIONS,
    ];
    const before: Record<string, number> = {};
    for (const c of dataCollections) before[c] = await count(c);
    console.table(before);

    if (!CONFIRM) {
      console.log(
        "\nDRY RUN. Re-run with `-- --confirm` to perform the migration."
      );
      console.log(
        "It will: back up accounts/posts, create the Sama profile, and stamp profileId everywhere."
      );
      return;
    }

    // 1. Backups (skip if already present — don't clobber a good backup) ──────
    for (const coll of ["accounts", "posts"]) {
      const backup = `${coll}${BACKUP_SUFFIX}`;
      if (await collectionExists(backup)) {
        console.log(`✓ Backup ${backup} already exists — skipping.`);
        continue;
      }
      await run({
        aggregate: coll,
        pipeline: [{ $match: {} }, { $out: backup }],
        cursor: {},
      });
      console.log(`✓ Backed up ${coll} -> ${backup}`);
    }

    // 2. Create / find the Sama profile ─────────────────────────────────────
    let samaHex: string;
    const existing = await firstDoc("profiles");
    const existingSama = (
      await run({ find: "profiles", filter: { name: SAMA_NAME }, limit: 1 })
    )?.cursor?.firstBatch?.[0];

    if (existingSama) {
      samaHex = idToHex(existingSama._id);
      console.log(`✓ Profile "${SAMA_NAME}" already exists (${samaHex}).`);
    } else {
      const cookie = (
        await run({
          find: "settings",
          filter: { _id: "instagram_cookie" },
          limit: 1,
        })
      )?.cursor?.firstBatch?.[0]?.value;
      const userAgent = (
        await run({
          find: "settings",
          filter: { _id: "user_agent" },
          limit: 1,
        })
      )?.cursor?.firstBatch?.[0]?.value;
      const backfilled =
        (
          await run({
            find: "settings",
            filter: { _id: "lost_state_backfilled" },
            limit: 1,
          })
        )?.cursor?.firstBatch?.[0]?.value === "1";

      samaHex = newObjectIdHex();
      const now = new Date().toISOString();
      await run({
        insert: "profiles",
        documents: [
          {
            _id: { $oid: samaHex },
            name: SAMA_NAME,
            avatarUrl: null,
            avatarColor: null,
            instagramCookie: cookie ?? null,
            userAgent: userAgent ?? null,
            igUserPk: null,
            igUsername: null,
            lostStateBackfilled: backfilled,
            createdAt: now,
            updatedAt: now,
          },
        ],
      });
      console.log(
        `✓ Created profile "${SAMA_NAME}" (${samaHex})` +
          (existing ? " — note: other profiles already exist." : "")
      );
    }

    // 3. Rewrite accounts & posts (reinsert with fresh ObjectId _id) ─────────
    const accountSample = await firstDoc("accounts");
    if (accountSample && accountSample.profileId) {
      console.log("✓ accounts already carry profileId — skipping rewrite.");
    } else if (before.accounts > 0) {
      await run({
        aggregate: "accounts",
        pipeline: [
          { $addFields: { pk: { $toString: "$_id" }, profileId: samaHex } },
          { $project: { _id: 0 } },
          { $out: "accounts" },
        ],
        cursor: {},
      });
      console.log(`✓ Rewrote ${before.accounts} accounts.`);
    }

    const postSample = await firstDoc("posts");
    if (postSample && postSample.profileId) {
      console.log("✓ posts already carry profileId — skipping rewrite.");
    } else if (before.posts > 0) {
      await run({
        aggregate: "posts",
        pipeline: [
          {
            $addFields: {
              pk: { $toString: "$_id" },
              mediaId: "$id",
              profileId: samaHex,
            },
          },
          { $project: { _id: 0, id: 0 } },
          { $out: "posts" },
        ],
        cursor: {},
      });
      console.log(`✓ Rewrote ${before.posts} posts.`);
    }

    // 4. Stamp profileId on the remaining collections ───────────────────────
    for (const coll of STAMP_ONLY_COLLECTIONS) {
      const r = await run({
        update: coll,
        updates: [
          {
            q: { profileId: { $exists: false } },
            u: { $set: { profileId: samaHex } },
            multi: true,
          },
        ],
      });
      console.log(`✓ Stamped profileId on ${coll} (matched ${r.n ?? 0}).`);
    }

    // 5. Verify counts unchanged ─────────────────────────────────────────────
    const after: Record<string, number> = {};
    for (const c of dataCollections) after[c] = await count(c);
    console.table(after);

    const mismatches = dataCollections.filter((c) => before[c] !== after[c]);
    if (mismatches.length > 0) {
      console.error(
        `⚠ COUNT MISMATCH in: ${mismatches.join(
          ", "
        )} — investigate before running \`prisma db push\`!`
      );
      process.exitCode = 1;
    } else {
      console.log(
        "\n✓ Migration complete. Counts match. Next: `npx prisma generate && npx prisma db push`."
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
