/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * One-time, idempotent backfill: local SQLite (Drizzle era) -> MongoDB (Prisma).
 *
 *   npm run backfill:mongo -- --sqlite ./data/instagram.db
 *
 * Safe to run repeatedly: every write is an upsert keyed by a stable
 * identifier (account.pk, post.pk, setting.key, run id, or a natural
 * composite key for history/notes/carousel rows).
 */
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";

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

function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  return idx !== -1 ? process.argv[idx + 1] : undefined;
}

const toBool = (v: any) => v === 1 || v === true || v === "1";
const toNull = <T>(v: T | undefined): T | null =>
  v === undefined || v === null ? (null as any) : v;

async function main() {
  loadDotEnv();

  if (!process.env.DATABASE_URL) {
    console.error("FATAL: DATABASE_URL is not set. Aborting.");
    process.exit(1);
  }

  const sqlitePath = path.resolve(
    getArg("sqlite") ?? "./data/instagram.db"
  );
  if (!fs.existsSync(sqlitePath)) {
    console.error(`FATAL: SQLite file not found: ${sqlitePath}`);
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    await prisma.$runCommandRaw({ ping: 1 });
  } catch (e) {
    console.error("FATAL: MongoDB is unreachable.", e);
    process.exit(1);
  }

  const sqlite = new Database(sqlitePath, { readonly: true });
  const all = (sql: string) => sqlite.prepare(sql).all() as any[];

  // ── target profile (multi-profile era) ───────────────────
  // All imported rows belong to one profile. Defaults to "Sama"; override
  // with `--profile <name>`.
  const profileName = getArg("profile") ?? "Sama";
  const nowIso = new Date().toISOString();
  const profile =
    (await prisma.profile.findUnique({ where: { name: profileName } })) ??
    (await prisma.profile.create({
      data: { name: profileName, createdAt: nowIso, updatedAt: nowIso },
    }));
  const profileId = profile.id;
  console.log(`Target profile: ${profileName} (${profileId})`);

  // ── settings (skip cloudinary_* — now env-only) ───────────
  // The session cookie / user-agent now live on the Profile; everything else
  // stays as a global setting.
  const settings = all("SELECT * FROM settings").filter(
    (s) => !String(s.key).startsWith("cloudinary_")
  );
  for (const s of settings) {
    if (s.key === "instagram_cookie" || s.key === "user_agent") {
      await prisma.profile.update({
        where: { id: profileId },
        data:
          s.key === "instagram_cookie"
            ? { instagramCookie: s.value, updatedAt: nowIso }
            : { userAgent: s.value, updatedAt: nowIso },
      });
      continue;
    }
    await prisma.setting.upsert({
      where: { key: s.key },
      create: { key: s.key, value: s.value, updatedAt: s.updated_at },
      update: { value: s.value, updatedAt: s.updated_at },
    });
  }
  console.log(`settings: ${settings.length}`);

  // ── scrapeRuns (numeric id preserved) ─────────────────────
  const runs = all("SELECT * FROM scrape_runs");
  let maxRunId = 0;
  for (const r of runs) {
    maxRunId = Math.max(maxRunId, r.id);
    const data = {
      status: r.status,
      startedAt: r.started_at,
      completedAt: toNull(r.completed_at),
      totalPostsFound: r.total_posts_found ?? 0,
      newPostsAdded: r.new_posts_added ?? 0,
      newAccountsFound: r.new_accounts_found ?? 0,
      pagesScraped: r.pages_scraped ?? 0,
      errorMessage: toNull(r.error_message),
      errorBody: toNull(r.error_body),
      checkpointMaxId: toNull(r.checkpoint_max_id),
      lostAccountsCount: r.lost_accounts_count ?? 0,
      lostAccountPks: toNull(r.lost_account_pks),
      usernameChangesCount: r.username_changes_count ?? 0,
      usernameChangeAccountPks: toNull(r.username_change_account_pks),
    };
    await prisma.scrapeRun.upsert({
      where: { id: r.id },
      create: { id: r.id, profileId, ...data },
      update: { profileId, ...data },
    });
  }
  console.log(`scrapeRuns: ${runs.length} (max id ${maxRunId})`);

  // ── accounts ──────────────────────────────────────────────
  const accounts = all("SELECT * FROM accounts");
  for (const a of accounts) {
    const data = {
      username: a.username,
      fullName: a.full_name ?? "",
      isVerified: toBool(a.is_verified),
      isPrivate: toBool(a.is_private),
      profilePicUrl: toNull(a.profile_pic_url),
      profilePicHash: toNull(a.profile_pic_hash),
      cloudinaryProfilePicUrl: toNull(a.cloudinary_profile_pic_url),
      savedPostCount: a.saved_post_count ?? 0,
      notes: toNull(a.notes),
      firstSeenAt: a.first_seen_at,
      lastSeenAt: a.last_seen_at,
      lastScrapeOn: toNull(a.last_scrape_on),
      accountStatus: toNull(a.account_status),
      statusChangedAt: toNull(a.status_changed_at),
      existsAlso: toNull(a.exists_also),
      discoveredInRunId: toNull(a.discovered_in_run_id),
    };
    await prisma.account.upsert({
      where: { profileId_pk: { profileId, pk: String(a.pk) } },
      create: { profileId, pk: String(a.pk), ...data },
      update: data,
    });
  }
  console.log(`accounts: ${accounts.length}`);

  // ── posts ─────────────────────────────────────────────────
  const posts = all("SELECT * FROM posts");
  for (const p of posts) {
    const data = {
      mediaId: p.id,
      code: p.code,
      accountPk: String(p.account_pk),
      mediaType: p.media_type,
      takenAt: p.taken_at,
      captionText: toNull(p.caption_text),
      likeCount: p.like_count ?? 0,
      commentCount: p.comment_count ?? 0,
      thumbnailUrl: toNull(p.thumbnail_url),
      cloudinaryThumbnailUrl: toNull(p.cloudinary_thumbnail_url),
      thumbnailWidth: toNull(p.thumbnail_width),
      thumbnailHeight: toNull(p.thumbnail_height),
      carouselMediaCount: toNull(p.carousel_media_count),
      scrapeRunId: toNull(p.scrape_run_id),
      createdAt: p.created_at,
    };
    await prisma.post.upsert({
      where: { profileId_pk: { profileId, pk: String(p.pk) } },
      create: { profileId, pk: String(p.pk), ...data },
      update: data,
    });
  }
  console.log(`posts: ${posts.length}`);

  // ── carouselMedia (natural key: postPk + position) ────────
  const carousel = all("SELECT * FROM carousel_media");
  for (const c of carousel) {
    const data = {
      profileId,
      postPk: String(c.post_pk),
      position: c.position,
      mediaType: c.media_type,
      mediaUrl: c.media_url ?? "",
      width: toNull(c.width),
      height: toNull(c.height),
      videoUrl: toNull(c.video_url),
      videoDuration: toNull(c.video_duration),
      cloudinaryUrl: toNull(c.cloudinary_url),
    };
    const existing = await prisma.carouselMedia.findFirst({
      where: { profileId, postPk: data.postPk, position: data.position },
      select: { id: true },
    });
    if (existing) {
      await prisma.carouselMedia.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await prisma.carouselMedia.create({ data });
    }
  }
  console.log(`carouselMedia: ${carousel.length}`);

  // ── accountNotes (natural key: accountPk+content+createdAt) ─
  const notes = all("SELECT * FROM account_notes");
  for (const n of notes) {
    const data = {
      profileId,
      accountPk: String(n.account_pk),
      content: n.content,
      createdAt: n.created_at,
    };
    const existing = await prisma.accountNote.findFirst({
      where: data,
      select: { id: true },
    });
    if (!existing) await prisma.accountNote.create({ data });
  }
  console.log(`accountNotes: ${notes.length}`);

  // ── accountStatusHistory ──────────────────────────────────
  const statusHist = all("SELECT * FROM account_status_history");
  for (const h of statusHist) {
    const data = {
      profileId,
      accountPk: String(h.account_pk),
      status: h.status,
      changedAt: h.changed_at,
    };
    const existing = await prisma.accountStatusHistory.findFirst({
      where: data,
      select: { id: true },
    });
    if (!existing) await prisma.accountStatusHistory.create({ data });
  }
  console.log(`accountStatusHistory: ${statusHist.length}`);

  // ── accountUsernameHistory ────────────────────────────────
  const nameHist = all("SELECT * FROM account_username_history");
  for (const h of nameHist) {
    const data = {
      profileId,
      accountPk: String(h.account_pk),
      oldUsername: h.old_username,
      newUsername: h.new_username,
      scrapeRunId: toNull(h.scrape_run_id),
      changedAt: h.changed_at,
    };
    const existing = await prisma.accountUsernameHistory.findFirst({
      where: {
        profileId,
        accountPk: data.accountPk,
        oldUsername: data.oldUsername,
        newUsername: data.newUsername,
        changedAt: data.changedAt,
      },
      select: { id: true },
    });
    if (!existing)
      await prisma.accountUsernameHistory.create({ data });
  }
  console.log(`accountUsernameHistory: ${nameHist.length}`);

  // ── scrape-run counter: next id must be > max imported ────
  await prisma.counter.upsert({
    where: { id: "scrapeRunId" },
    create: { id: "scrapeRunId", seq: maxRunId },
    update: { seq: maxRunId },
  });
  console.log(`counter scrapeRunId set to ${maxRunId}`);

  sqlite.close();
  await prisma.$disconnect();
  console.log("Backfill complete.");
}

main().catch(async (e) => {
  console.error("Backfill failed:", e);
  process.exit(1);
});
