import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;
  const id = parseInt(runId);

  if (isNaN(id)) {
    return NextResponse.json(
      { error: "Scrape run not found" },
      { status: 404 }
    );
  }

  const run = await prisma.scrapeRun.findUnique({ where: { id } });

  if (!run) {
    return NextResponse.json(
      { error: "Scrape run not found" },
      { status: 404 }
    );
  }

  const lostAccountPkList: string[] = run.lostAccountPks
    ? JSON.parse(run.lostAccountPks)
    : [];

  const [newPosts, newAccounts, lostAccounts, usernameHistory] =
    await Promise.all([
      prisma.post.findMany({
        where: { scrapeRunId: id },
        orderBy: { takenAt: "desc" },
      }),
      prisma.account.findMany({ where: { discoveredInRunId: id } }),
      lostAccountPkList.length > 0
        ? prisma.account.findMany({
            where: { pk: { in: lostAccountPkList } },
          })
        : Promise.resolve([]),
      prisma.accountUsernameHistory.findMany({
        where: { scrapeRunId: id },
        orderBy: { changedAt: "desc" },
      }),
    ]);

  const usernameChangeAccountPks = [
    ...new Set(usernameHistory.map((change) => change.accountPk)),
  ];
  const usernameChangeAccounts =
    usernameChangeAccountPks.length > 0
      ? await prisma.account.findMany({
          where: { pk: { in: usernameChangeAccountPks } },
        })
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
