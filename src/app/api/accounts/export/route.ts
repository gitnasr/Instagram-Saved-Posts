import { db } from "@/db";
import { accounts, accountNotes } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  parseAccountFilters,
  buildAccountWhereClause,
  buildAccountOrderClause,
} from "@/lib/account-filters";

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sort = searchParams.get("sort") ?? "post_count";
  const order = searchParams.get("order") ?? "desc";

  const filters = parseAccountFilters(searchParams);
  const whereClause = buildAccountWhereClause(filters);
  const orderClause = buildAccountOrderClause(sort, order);

  const allAccounts = db
    .select()
    .from(accounts)
    .where(whereClause)
    .orderBy(orderClause)
    .all();

  // Fetch all notes for these accounts in one query, keyed by accountPk
  const accountPks = allAccounts.map((a) => a.pk);
  const notesMap = new Map<string, string[]>();

  if (accountPks.length > 0) {
    // SQLite doesn't support IN with prepared statements in drizzle easily for large arrays,
    // so fetch all notes and filter in JS (fine since total accounts is typically <10k)
    const allNotes = db
      .select({ accountPk: accountNotes.accountPk, content: accountNotes.content })
      .from(accountNotes)
      .all();

    for (const note of allNotes) {
      if (!notesMap.has(note.accountPk)) {
        notesMap.set(note.accountPk, []);
      }
      notesMap.get(note.accountPk)!.push(note.content);
    }
  }

  const csvHeader =
    "username,fullName,isVerified,isPrivate,savedPostCount,firstSeenAt,lastSeenAt,profilePicUrl,notes";

  const csvRows = allAccounts.map((a) => {
    const notes = notesMap.get(a.pk) ?? [];
    return [
      escapeCsv(a.username),
      escapeCsv(a.fullName),
      a.isVerified ? "true" : "false",
      a.isPrivate ? "true" : "false",
      String(a.savedPostCount),
      a.firstSeenAt,
      a.lastSeenAt,
      escapeCsv(a.cloudinaryProfilePicUrl ?? a.profilePicUrl ?? ""),
      escapeCsv(notes.join(" | ")),
    ].join(",");
  });

  const csv = [csvHeader, ...csvRows].join("\n");
  const date = new Date().toISOString().split("T")[0];

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="accounts-export-${date}.csv"`,
    },
  });
}
