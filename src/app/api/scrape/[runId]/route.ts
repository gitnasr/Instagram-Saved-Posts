import { NextResponse } from "next/server";
import { db } from "@/db";
import { accountUsernameHistory, scrapeRuns, posts, accounts } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";

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

  const lostAccountPkList: string[] = run.lostAccountPks
    ? JSON.parse(run.lostAccountPks)
    : [];

  const lostAccounts =
    lostAccountPkList.length > 0
      ? db
          .select()
          .from(accounts)
          .where(inArray(accounts.pk, lostAccountPkList))
          .all()
      : [];

  const usernameHistory = db
    .select()
    .from(accountUsernameHistory)
    .where(eq(accountUsernameHistory.scrapeRunId, id))
    .orderBy(desc(accountUsernameHistory.changedAt))
    .all();

  const usernameChangeAccountPks = [
    ...new Set(usernameHistory.map((change) => change.accountPk)),
  ];
  const usernameChangeAccounts =
    usernameChangeAccountPks.length > 0
      ? db
          .select()
          .from(accounts)
          .where(inArray(accounts.pk, usernameChangeAccountPks))
          .all()
      : [];
  const usernameChangeAccountMap = new Map(
    usernameChangeAccounts.map((account) => [account.pk, account])
  );
  const usernameChanges = usernameHistory
    .map((change) => {
      const account = usernameChangeAccountMap.get(change.accountPk);
      return account ? { ...change, account } : null;
    })
    .filter((change) => change !== null);

  return NextResponse.json({
    run,
    newPosts,
    newAccounts,
    lostAccounts,
    usernameChanges,
  });
}
