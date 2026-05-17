import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "instagram.db");

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const sqlite = new Database(DB_PATH);

sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const accountColumns = sqlite
  .prepare("PRAGMA table_info(accounts)")
  .all() as Array<{ name: string }>;
const accountColumnNames = new Set(accountColumns.map((column) => column.name));

const accountColumnMigrations = [
  {
    name: "last_scrape_on",
    statement: "ALTER TABLE accounts ADD COLUMN last_scrape_on TEXT",
  },
  {
    name: "account_status",
    statement: "ALTER TABLE accounts ADD COLUMN account_status TEXT",
  },
  {
    name: "status_changed_at",
    statement: "ALTER TABLE accounts ADD COLUMN status_changed_at TEXT",
  },
  {
    name: "exists_also",
    statement: "ALTER TABLE accounts ADD COLUMN exists_also TEXT",
  },
];

for (const migration of accountColumnMigrations) {
  if (!accountColumnNames.has(migration.name)) {
    sqlite.exec(migration.statement);
  }
}

const scrapeRunColumns = sqlite
  .prepare("PRAGMA table_info(scrape_runs)")
  .all() as Array<{ name: string }>;
const scrapeRunColumnNames = new Set(
  scrapeRunColumns.map((column) => column.name)
);

const scrapeRunColumnMigrations = [
  {
    name: "username_changes_count",
    statement:
      "ALTER TABLE scrape_runs ADD COLUMN username_changes_count INTEGER NOT NULL DEFAULT 0",
  },
  {
    name: "username_change_account_pks",
    statement: "ALTER TABLE scrape_runs ADD COLUMN username_change_account_pks TEXT",
  },
];

for (const migration of scrapeRunColumnMigrations) {
  if (!scrapeRunColumnNames.has(migration.name)) {
    sqlite.exec(migration.statement);
  }
}

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS account_status_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_pk TEXT NOT NULL,
    status TEXT NOT NULL,
    changed_at TEXT NOT NULL,
    FOREIGN KEY (account_pk) REFERENCES accounts(pk) ON DELETE CASCADE
  )
`);

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS account_username_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_pk TEXT NOT NULL,
    old_username TEXT NOT NULL,
    new_username TEXT NOT NULL,
    scrape_run_id INTEGER,
    changed_at TEXT NOT NULL,
    FOREIGN KEY (account_pk) REFERENCES accounts(pk) ON DELETE CASCADE,
    FOREIGN KEY (scrape_run_id) REFERENCES scrape_runs(id)
  )
`);

export const db = drizzle(sqlite, { schema });
