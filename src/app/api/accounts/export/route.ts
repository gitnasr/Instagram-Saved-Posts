import { prisma } from "@/lib/prisma";
import {
  parseAccountFilters,
  buildAccountWhere,
  buildAccountOrderBy,
  resolveNoteFilterContext,
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
  const noteCtx = await resolveNoteFilterContext(filters);
  const where = buildAccountWhere(filters, noteCtx);
  const orderBy = buildAccountOrderBy(sort, order);

  const allAccounts = await prisma.account.findMany({ where, orderBy });

  // Fetch all notes once, keyed by accountPk
  const allNotes = await prisma.accountNote.findMany({
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
