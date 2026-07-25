/**
 * One-time, idempotent backfill: seed `accountEvents` from data that predates
 * the timeline feature.
 *
 *   npm run backfill:events            # dry run (counts + plan only)
 *   npm run backfill:events -- --confirm
 *
 * Seeds, per profile:
 *   discovered       <- Account.firstSeenAt (+ discoveredInRunId)
 *   username_changed <- accountUsernameHistory rows
 *   status_changed   <- accountStatusHistory rows
 *   lost / recovered <- Account.lostAt / recoveredAt
 *   new_post         <- Post.createdAt (occurredAt) + takenAt (metadata)
 *   ignored          <- Account.ignoredAt
 *
 * Privacy, verified, full-name and profile-pic history cannot be reconstructed
 * — nothing ever recorded them. Those start accruing on the next scrape.
 *
 * Guarded by `Profile.eventsBackfilled`, so re-running is a no-op rather than a
 * duplicate. Run after `prisma db push`.
 */
import fs from "fs";
import path from "path";
import { PrismaClient, type Prisma } from "@prisma/client";

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
const CHUNK = 1000;

async function main() {
  loadDotEnv();
  if (!process.env.DATABASE_URL) {
    console.error("FATAL: DATABASE_URL is not set. Aborting.");
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    const profiles = await prisma.profile.findMany({
      select: { id: true, name: true, eventsBackfilled: true },
    });

    if (profiles.length === 0) {
      console.log("No profiles found. Nothing to do.");
      return;
    }

    for (const profile of profiles) {
      const label = `[${profile.name}]`;

      if (profile.eventsBackfilled) {
        console.log(`${label} already backfilled — skipping.`);
        continue;
      }

      const profileId = profile.id;
      const events: Prisma.AccountEventCreateManyInput[] = [];

      const accounts = await prisma.account.findMany({
        where: { profileId },
        select: {
          pk: true,
          firstSeenAt: true,
          discoveredInRunId: true,
          lostAt: true,
          recoveredAt: true,
          ignoredAt: true,
          accountStatus: true,
        },
      });

      for (const account of accounts) {
        events.push({
          profileId,
          accountPk: account.pk,
          type: "discovered",
          occurredAt: account.firstSeenAt,
          scrapeRunId: account.discoveredInRunId,
        });

        if (account.lostAt) {
          events.push({
            profileId,
            accountPk: account.pk,
            type: "lost",
            occurredAt: account.lostAt,
          });
        }
        if (account.recoveredAt) {
          events.push({
            profileId,
            accountPk: account.pk,
            type: "recovered",
            occurredAt: account.recoveredAt,
          });
        }
        if (account.ignoredAt) {
          events.push({
            profileId,
            accountPk: account.pk,
            type: "ignored",
            occurredAt: account.ignoredAt,
          });
        }
      }

      const usernameHistory = await prisma.accountUsernameHistory.findMany({
        where: { profileId },
      });
      for (const row of usernameHistory) {
        events.push({
          profileId,
          accountPk: row.accountPk,
          type: "username_changed",
          occurredAt: row.changedAt,
          fromValue: row.oldUsername,
          toValue: row.newUsername,
          scrapeRunId: row.scrapeRunId,
        });
      }

      const statusHistory = await prisma.accountStatusHistory.findMany({
        where: { profileId },
      });
      for (const row of statusHistory) {
        events.push({
          profileId,
          accountPk: row.accountPk,
          type: "status_changed",
          occurredAt: row.changedAt,
          toValue: row.status,
        });
      }

      const posts = await prisma.post.findMany({
        where: { profileId },
        select: {
          pk: true,
          code: true,
          accountPk: true,
          takenAt: true,
          createdAt: true,
          scrapeRunId: true,
        },
      });
      for (const post of posts) {
        events.push({
          profileId,
          accountPk: post.accountPk,
          type: "new_post",
          occurredAt: post.createdAt,
          toValue: post.code,
          scrapeRunId: post.scrapeRunId,
          metadata: JSON.stringify({ postPk: post.pk, takenAt: post.takenAt }),
        });
      }

      console.log(
        `${label} ${accounts.length} accounts, ${posts.length} posts, ` +
          `${usernameHistory.length} renames, ${statusHistory.length} status rows ` +
          `=> ${events.length} events`
      );

      if (!CONFIRM) {
        console.log(`${label} dry run — pass --confirm to write.`);
        continue;
      }

      for (let i = 0; i < events.length; i += CHUNK) {
        await prisma.accountEvent.createMany({
          data: events.slice(i, i + CHUNK),
        });
        console.log(
          `${label} wrote ${Math.min(i + CHUNK, events.length)}/${events.length}`
        );
      }

      await prisma.profile.update({
        where: { id: profileId },
        data: { eventsBackfilled: true, updatedAt: new Date().toISOString() },
      });
      console.log(`${label} done.`);
    }

    if (!CONFIRM) {
      console.log("\nDry run complete. Re-run with --confirm to apply.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
