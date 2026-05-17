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
  profilePicHash: text("profile_pic_hash"),
  cloudinaryProfilePicUrl: text("cloudinary_profile_pic_url"),
  savedPostCount: integer("saved_post_count").notNull().default(0),
  notes: text("notes"), // legacy single-text notes – kept for compatibility
  firstSeenAt: text("first_seen_at").notNull(),
  lastSeenAt: text("last_seen_at").notNull(),
  lastScrapeOn: text("last_scrape_on"),
  accountStatus: text("account_status"),
  statusChangedAt: text("status_changed_at"),
  existsAlso: text("exists_also"),
  discoveredInRunId: integer("discovered_in_run_id").references(
    () => scrapeRuns.id
  ),
});

// ─── ACCOUNT NOTES ─────────────────────────────────────────
export const accountNotes = sqliteTable("account_notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountPk: text("account_pk")
    .notNull()
    .references(() => accounts.pk, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull(),
});

export const accountStatusHistory = sqliteTable("account_status_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountPk: text("account_pk")
    .notNull()
    .references(() => accounts.pk, { onDelete: "cascade" }),
  status: text("status").notNull(),
  changedAt: text("changed_at").notNull(),
});

export const accountUsernameHistory = sqliteTable("account_username_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountPk: text("account_pk")
    .notNull()
    .references(() => accounts.pk, { onDelete: "cascade" }),
  oldUsername: text("old_username").notNull(),
  newUsername: text("new_username").notNull(),
  scrapeRunId: integer("scrape_run_id").references(() => scrapeRuns.id),
  changedAt: text("changed_at").notNull(),
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
  cloudinaryThumbnailUrl: text("cloudinary_thumbnail_url"),
  thumbnailWidth: integer("thumbnail_width"),
  thumbnailHeight: integer("thumbnail_height"),
  carouselMediaCount: integer("carousel_media_count"),
  scrapeRunId: integer("scrape_run_id").references(() => scrapeRuns.id),
  createdAt: text("created_at").notNull(),
});

// ─── CAROUSEL MEDIA ───────────────────────────────────────
export const carouselMedia = sqliteTable("carousel_media", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  postPk: text("post_pk")
    .notNull()
    .references(() => posts.pk),
  position: integer("position").notNull(),
  mediaType: integer("media_type").notNull(),
  mediaUrl: text("media_url").notNull(),
  width: integer("width"),
  height: integer("height"),
  videoUrl: text("video_url"),
  videoDuration: real("video_duration"),
  cloudinaryUrl: text("cloudinary_url"),
});

// ─── SCRAPE RUNS ───────────────────────────────────────────
export const scrapeRuns = sqliteTable("scrape_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  status: text("status", {
    enum: ["running", "completed", "failed", "cancelled", "interrupted"],
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
  errorBody: text("error_body"), // JSON-stringified Instagram API response on failure
  // Checkpoint for resume support
  checkpointMaxId: text("checkpoint_max_id"),
  // Lost accounts detection
  lostAccountsCount: integer("lost_accounts_count").notNull().default(0),
  lostAccountPks: text("lost_account_pks"), // JSON array of pk strings
  // Username change detection
  usernameChangesCount: integer("username_changes_count").notNull().default(0),
  usernameChangeAccountPks: text("username_change_account_pks"), // JSON array of pk strings
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
  accountNotes: many(accountNotes),
  statusHistory: many(accountStatusHistory),
  usernameHistory: many(accountUsernameHistory),
  discoveredInRun: one(scrapeRuns, {
    fields: [accounts.discoveredInRunId],
    references: [scrapeRuns.id],
  }),
}));

export const accountNotesRelations = relations(accountNotes, ({ one }) => ({
  account: one(accounts, {
    fields: [accountNotes.accountPk],
    references: [accounts.pk],
  }),
}));

export const accountStatusHistoryRelations = relations(
  accountStatusHistory,
  ({ one }) => ({
    account: one(accounts, {
      fields: [accountStatusHistory.accountPk],
      references: [accounts.pk],
    }),
  })
);

export const accountUsernameHistoryRelations = relations(
  accountUsernameHistory,
  ({ one }) => ({
    account: one(accounts, {
      fields: [accountUsernameHistory.accountPk],
      references: [accounts.pk],
    }),
    scrapeRun: one(scrapeRuns, {
      fields: [accountUsernameHistory.scrapeRunId],
      references: [scrapeRuns.id],
    }),
  })
);

export const postsRelations = relations(posts, ({ one, many }) => ({
  account: one(accounts, {
    fields: [posts.accountPk],
    references: [accounts.pk],
  }),
  scrapeRun: one(scrapeRuns, {
    fields: [posts.scrapeRunId],
    references: [scrapeRuns.id],
  }),
  carouselItems: many(carouselMedia),
}));

export const carouselMediaRelations = relations(carouselMedia, ({ one }) => ({
  post: one(posts, {
    fields: [carouselMedia.postPk],
    references: [posts.pk],
  }),
}));

export const scrapeRunsRelations = relations(scrapeRuns, ({ many }) => ({
  posts: many(posts),
  discoveredAccounts: many(accounts),
  usernameChanges: many(accountUsernameHistory),
}));
