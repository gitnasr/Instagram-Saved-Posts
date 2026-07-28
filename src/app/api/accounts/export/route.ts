import type { Account } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getActiveProfile, noActiveProfileResponse } from "@/lib/active-profile";
import {
  parseAccountFilters,
  buildAccountWhere,
  buildAccountOrderBy,
  resolveNoteFilterContext,
  notIgnoredWhere,
} from "@/lib/account-filters";

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Rows are emitted in fixed groups, in this order:
 *   0. recently discovered, public
 *   1. public
 *   2. recently discovered, private
 *   3. private
 *   4. lost
 *
 * "Recently discovered" means the account first appeared in the newest scrape
 * run that actually found new accounts. Keying off the newest run outright
 * would empty both groups whenever the last scrape turned up nothing new.
 *
 * Lost takes precedence over privacy — a lost account can't be re-checked, so
 * its last-known privacy is not worth grouping on.
 */
function exportGroupRank(
  account: Account,
  latestRunId: number | null
): number {
  if (account.lostAt) return 4;

  const isRecent =
    latestRunId !== null && account.discoveredInRunId === latestRunId;

  if (!account.isPrivate) return isRecent ? 0 : 1;
  return isRecent ? 2 : 3;
}

export async function GET(request: Request) {
  const profile = await getActiveProfile();
  if (!profile) return noActiveProfileResponse();

  const { searchParams } = new URL(request.url);
  const sort = searchParams.get("sort") ?? "post_count";
  const order = searchParams.get("order") ?? "desc";

  const filters = parseAccountFilters(searchParams);
  const noteCtx = await resolveNoteFilterContext(filters, profile.id);
  // Ignored accounts are always excluded from the export, whatever the filters
  // say — that is the whole point of the flag. Clear it to get them back.
  const where = {
    AND: [buildAccountWhere(filters, profile.id, noteCtx), notIgnoredWhere],
  };
  const orderBy = buildAccountOrderBy(sort, order);

  const [allAccounts, newestDiscovery] = await Promise.all([
    prisma.account.findMany({ where, orderBy }),
    // Highest run id that stamped an account. Deliberately computed across the
    // whole profile, not the filtered set, so a narrow filter cannot promote an
    // older run's accounts into the "recently discovered" groups.
    prisma.account.findFirst({
      where: { profileId: profile.id, discoveredInRunId: { not: null } },
      orderBy: { discoveredInRunId: "desc" },
      select: { discoveredInRunId: true },
    }),
  ]);

  // Array.prototype.sort is stable, so grouping keeps the requested `orderBy`
  // as the within-group order.
  const latestRunId = newestDiscovery?.discoveredInRunId ?? null;
  allAccounts.sort(
    (a, b) => exportGroupRank(a, latestRunId) - exportGroupRank(b, latestRunId)
  );

  // Fetch all notes once, keyed by accountPk
  const allNotes = await prisma.accountNote.findMany({
    where: { profileId: profile.id },
    select: { accountPk: true, content: true },
  });
  const notesMap = new Map<string, string[]>();
  for (const note of allNotes) {
    if (!notesMap.has(note.accountPk)) {
      notesMap.set(note.accountPk, []);
    }
    notesMap.get(note.accountPk)!.push(note.content);
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
