import { NextResponse } from "next/server";
import { db } from "@/db";
import { scrapeRuns, posts, accounts } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;
  const id = parseInt(runId);

  const run = db
    .select()
    .from(scrapeRuns)
    .where(eq(scrapeRuns.id, id))
    .get();

  if (!run) {
    return NextResponse.json(
      { error: "Scrape run not found" },
      { status: 404 }
    );
  }

  const newPosts = db
    .select()
    .from(posts)
    .where(eq(posts.scrapeRunId, id))
    .orderBy(desc(posts.takenAt))
    .all();

  const newAccounts = db
    .select()
    .from(accounts)
    .where(eq(accounts.discoveredInRunId, id))
    .all();

  return NextResponse.json({ run, newPosts, newAccounts });
}
