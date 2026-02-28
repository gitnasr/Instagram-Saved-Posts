import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// ─── ACCOUNTS ──────────────────────────────────────────────
export const accounts = sqliteTable("accounts", {
  pk: text("pk").primaryKey(),
  username: text("username").notNull().unique(),
  fullName: text("full_name").notNull().default(""),
  isVerified: integer("is_verified", { mode: "boolean" })
    .notNull()
    .default(false),
  isPrivate: integer("is_private", { mode: "boolean" })
    .notNull()
    .default(false),
  profilePicUrl: text("profile_pic_url"),
  savedPostCount: integer("saved_post_count").notNull().default(0),
  firstSeenAt: text("first_seen_at").notNull(),
  lastSeenAt: text("last_seen_at").notNull(),
  discoveredInRunId: integer("discovered_in_run_id").references(
    () => scrapeRuns.id
  ),
});

// ─── POSTS ─────────────────────────────────────────────────
export const posts = sqliteTable("posts", {
  pk: text("pk").primaryKey(),
  id: text("id").notNull(),
  code: text("code").notNull(),
  accountPk: text("account_pk")
    .notNull()
    .references(() => accounts.pk),
  mediaType: integer("media_type").notNull(),
  takenAt: integer("taken_at").notNull(),
  captionText: text("caption_text"),
  likeCount: integer("like_count").notNull().default(0),
  commentCount: integer("comment_count").notNull().default(0),
  thumbnailUrl: text("thumbnail_url"),
  thumbnailWidth: integer("thumbnail_width"),
  thumbnailHeight: integer("thumbnail_height"),
  carouselMediaCount: integer("carousel_media_count"),
  scrapeRunId: integer("scrape_run_id").references(() => scrapeRuns.id),
  createdAt: text("created_at").notNull(),
});

// ─── SCRAPE RUNS ───────────────────────────────────────────
export const scrapeRuns = sqliteTable("scrape_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  status: text("status", {
    enum: ["running", "completed", "failed", "cancelled"],
  })
    .notNull()
    .default("running"),
  startedAt: text("started_at").notNull(),
  completedAt: text("completed_at"),
  totalPostsFound: integer("total_posts_found").notNull().default(0),
  newPostsAdded: integer("new_posts_added").notNull().default(0),
  newAccountsFound: integer("new_accounts_found").notNull().default(0),
  pagesScraped: integer("pages_scraped").notNull().default(0),
  errorMessage: text("error_message"),
});

// ─── SETTINGS ──────────────────────────────────────────────
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ─── RELATIONS ─────────────────────────────────────────────
export const accountsRelations = relations(accounts, ({ many, one }) => ({
  posts: many(posts),
  discoveredInRun: one(scrapeRuns, {
    fields: [accounts.discoveredInRunId],
    references: [scrapeRuns.id],
  }),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  account: one(accounts, {
    fields: [posts.accountPk],
    references: [accounts.pk],
  }),
  scrapeRun: one(scrapeRuns, {
    fields: [posts.scrapeRunId],
    references: [scrapeRuns.id],
  }),
}));

export const scrapeRunsRelations = relations(scrapeRuns, ({ many }) => ({
  posts: many(posts),
  discoveredAccounts: many(accounts),
}));
