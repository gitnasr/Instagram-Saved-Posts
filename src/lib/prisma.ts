import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "production"
        ? ["error", "warn"]
        : ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Atomically allocate the next numeric scrape-run id from the Mongo
 * `counters` collection. Preserves stable /scrape/<id> URLs without
 * relying on SQLite autoincrement.
 */
export async function getNextScrapeRunId(): Promise<number> {
  const result = (await prisma.$runCommandRaw({
    findAndModify: "counters",
    query: { _id: "scrapeRunId" },
    update: { $inc: { seq: 1 } },
    upsert: true,
    new: true,
  })) as { value?: { seq?: number } | null };

  const seq = result.value?.seq;
  if (typeof seq !== "number") {
    throw new Error("Failed to allocate scrape run id from counters");
  }
  return seq;
}
