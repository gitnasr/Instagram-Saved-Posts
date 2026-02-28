import { db } from "@/db";
import { accounts, posts, scrapeRuns, settings } from "@/db/schema";
import { fetchSavedPostsPage } from "./instagram-api";
import { eq, sql } from "drizzle-orm";
import type { InstagramMedia } from "@/types/instagram";
import { SCRAPE_DELAY_MIN_MS, SCRAPE_DELAY_MAX_MS } from "./constants";

export interface ScrapeProgress {
  runId: number;
  status: "running" | "completed" | "failed" | "cancelled";
  pagesScraped: number;
  totalPostsFound: number;
  newPostsAdded: number;
  newAccountsFound: number;
}

let currentScrapeState: ScrapeProgress | null = null;

export function getCurrentScrapeState(): ScrapeProgress | null {
  return currentScrapeState;
}

export async function runScrape(): Promise<number> {
  if (currentScrapeState?.status === "running") {
    throw new Error("A scrape is already in progress");
  }

  const cookieRow = db
    .select()
    .from(settings)
    .where(eq(settings.key, "instagram_cookie"))
    .get();

  if (!cookieRow) {
    throw new Error("No Instagram cookie configured. Go to Settings first.");
  }

  const userAgentRow = db
    .select()
    .from(settings)
    .where(eq(settings.key, "user_agent"))
    .get();

  const now = new Date().toISOString();
  const run = db
    .insert(scrapeRuns)
    .values({ startedAt: now, status: "running" })
    .returning()
    .get();

  currentScrapeState = {
    runId: run.id,
    status: "running",
    pagesScraped: 0,
    totalPostsFound: 0,
    newPostsAdded: 0,
    newAccountsFound: 0,
  };

  scrapeAllPages(run.id, cookieRow.value, userAgentRow?.value).catch(
    (error) => {
      const errorMsg =
        error instanceof Error ? error.message : "Unknown error";
      db.update(scrapeRuns)
        .set({
          status: "failed",
          completedAt: new Date().toISOString(),
          errorMessage: errorMsg,
        })
        .where(eq(scrapeRuns.id, run.id))
        .run();

      if (currentScrapeState?.runId === run.id) {
        currentScrapeState.status = "failed";
      }
    }
  );

  return run.id;
}

async function scrapeAllPages(
  runId: number,
  cookie: string,
  userAgent?: string
): Promise<void> {
  let maxId: string | undefined;
  let hasMore = true;

  try {
    while (hasMore) {
      const page = await fetchSavedPostsPage({
        cookie,
        userAgent,
        maxId,
      });

      for (const item of page.items) {
        processMediaItem(item.media, runId);
      }

      if (currentScrapeState?.runId === runId) {
        currentScrapeState.pagesScraped += 1;
        currentScrapeState.totalPostsFound += page.num_results;
      }

      db.update(scrapeRuns)
        .set({
          pagesScraped: currentScrapeState!.pagesScraped,
          totalPostsFound: currentScrapeState!.totalPostsFound,
          newPostsAdded: currentScrapeState!.newPostsAdded,
          newAccountsFound: currentScrapeState!.newAccountsFound,
        })
        .where(eq(scrapeRuns.id, runId))
        .run();

      hasMore = page.more_available;
      maxId = page.next_max_id;

      if (hasMore) {
        await delay(
          SCRAPE_DELAY_MIN_MS +
            Math.random() * (SCRAPE_DELAY_MAX_MS - SCRAPE_DELAY_MIN_MS)
        );
      }
    }

    recalculateAccountPostCounts();

    db.update(scrapeRuns)
      .set({
        status: "completed",
        completedAt: new Date().toISOString(),
        totalPostsFound: currentScrapeState!.totalPostsFound,
        newPostsAdded: currentScrapeState!.newPostsAdded,
        newAccountsFound: currentScrapeState!.newAccountsFound,
        pagesScraped: currentScrapeState!.pagesScraped,
      })
      .where(eq(scrapeRuns.id, runId))
      .run();

    if (currentScrapeState?.runId === runId) {
      currentScrapeState.status = "completed";
    }
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Unknown error";
    db.update(scrapeRuns)
      .set({
        status: "failed",
        completedAt: new Date().toISOString(),
        errorMessage: errorMsg,
      })
      .where(eq(scrapeRuns.id, runId))
      .run();

    if (currentScrapeState?.runId === runId) {
      currentScrapeState.status = "failed";
    }
  }
}

function processMediaItem(media: InstagramMedia, runId: number): void {
  const now = new Date().toISOString();
  const mediaPk = String(media.pk);
  const accountPkStr = String(media.user.pk);

  // Upsert account
  const existingAccount = db
    .select()
    .from(accounts)
    .where(eq(accounts.pk, accountPkStr))
    .get();

  if (!existingAccount) {
    db.insert(accounts)
      .values({
        pk: accountPkStr,
        username: media.user.username,
        fullName: media.user.full_name,
        isVerified: media.user.is_verified,
        isPrivate: media.user.is_private,
        profilePicUrl: media.user.profile_pic_url,
        savedPostCount: 0,
        firstSeenAt: now,
        lastSeenAt: now,
        discoveredInRunId: runId,
      })
      .run();

    if (currentScrapeState) {
      currentScrapeState.newAccountsFound += 1;
    }
  } else {
    db.update(accounts)
      .set({
        username: media.user.username,
        fullName: media.user.full_name,
        isVerified: media.user.is_verified,
        isPrivate: media.user.is_private,
        profilePicUrl: media.user.profile_pic_url,
        lastSeenAt: now,
      })
      .where(eq(accounts.pk, accountPkStr))
      .run();
  }

  // Upsert post
  const existingPost = db
    .select()
    .from(posts)
    .where(eq(posts.pk, mediaPk))
    .get();

  if (!existingPost) {
    const thumbnail = media.image_versions2?.candidates?.[0];

    db.insert(posts)
      .values({
        pk: mediaPk,
        id: media.id,
        code: media.code,
        accountPk: accountPkStr,
        mediaType: media.media_type,
        takenAt: media.taken_at,
        captionText: media.caption?.text ?? null,
        likeCount: media.like_count,
        commentCount: media.comment_count ?? 0,
        thumbnailUrl: thumbnail?.url ?? null,
        thumbnailWidth: thumbnail?.width ?? null,
        thumbnailHeight: thumbnail?.height ?? null,
        carouselMediaCount: media.carousel_media_count ?? null,
        scrapeRunId: runId,
        createdAt: now,
      })
      .run();

    if (currentScrapeState) {
      currentScrapeState.newPostsAdded += 1;
    }
  } else {
    db.update(posts)
      .set({
        likeCount: media.like_count,
        commentCount: media.comment_count ?? 0,
        captionText: media.caption?.text ?? null,
      })
      .where(eq(posts.pk, mediaPk))
      .run();
  }
}

function recalculateAccountPostCounts(): void {
  db.run(sql`
    UPDATE accounts
    SET saved_post_count = (
      SELECT COUNT(*) FROM posts WHERE posts.account_pk = accounts.pk
    )
  `);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
