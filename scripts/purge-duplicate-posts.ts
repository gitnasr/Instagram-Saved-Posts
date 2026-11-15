// Removes duplicate posts: the same post stored under its rounded pk and again
// under its exact pk. v1.5.2 added exact-pk copies of rounded rows; v1.5.3 added
// rounded copies of exact rows when Instagram sent pk as a number again. The
// earliest row is the original, so it stays. Back up the database before --apply.
//
// Preview: npx tsx --env-file-if-exists=.env scripts/purge-duplicate-posts.ts [--profile <profileId>]
// Delete:  add --apply
// Cloudinary files of duplicates need credentials in the environment, or
// --leave-cloudinary-files to knowingly orphan them.
import { QdrantClient } from "@qdrant/js-client-rest";
import { v2 as cloudinary } from "cloudinary";
import { getCloudinaryConfigFromDB, isCloudinaryConfigured } from "../src/lib/cloudinary";
import { prisma } from "../src/lib/prisma";
import { recalculateAccountPostCounts } from "../src/lib/scraper/post-sync";
import { COLLECTIONS, getQdrantConfig, isQdrantConfigured } from "../src/lib/vector/qdrant-client";

/** Small enough to finish well inside MongoDB's 60s transaction limit. */
const POSTS_PER_TRANSACTION = 50;

interface PostRow {
  id: string;
  pk: string;
  code: string;
  mediaId: string;
  scrapeRunId: number | null;
  cloudinaryThumbnailUrl: string | null;
}

/**
 * A row is a duplicate only if it shares its mediaId with an earlier-run row and
 * both pks round to the same number. `code` can't identify a post: the two APIs can send a
 * short and a long code for the same one. Anything else sharing a mediaId isn't
 * this bug, so that post is left alone and reported.
 */
export function findDuplicates<T extends { pk: string; mediaId: string; scrapeRunId: number | null }>(
  posts: T[]
): { duplicates: T[]; unresolved: T[][] } {
  const byMediaId = new Map<string, T[]>();
  for (const post of posts) {
    byMediaId.set(post.mediaId, [...(byMediaId.get(post.mediaId) ?? []), post]);
  }

  const duplicates: T[] = [];
  const unresolved: T[][] = [];
  for (const rows of byMediaId.values()) {
    if (rows.length < 2) continue;
    const runOf = (r: T) => r.scrapeRunId ?? -1;
    const firstRun = Math.min(...rows.map(runOf));
    const originals = rows.filter((r) => runOf(r) === firstRun);
    const original = originals[0];
    const extra = rows.filter(
      (r) => r !== original && String(Number(r.pk)) === String(Number(original.pk))
    );
    if (originals.length === 1 && rows.length - extra.length === 1) duplicates.push(...extra);
    else unresolved.push(rows);
  }
  return { duplicates, unresolved };
}

/** Read the asset's identity from its stored URL rather than rebuilding it. */
export function parseCloudinaryUrl(
  url: string
): { resourceType: "image" | "video"; publicId: string } | null {
  const match = url.match(/\/(image|video)\/upload\/(?:v\d+\/)?([^?#]+?)(?:\.[a-z0-9]+)?(?:[?#].*)?$/i);
  return match
    ? { resourceType: match[1].toLowerCase() as "image" | "video", publicId: match[2] }
    : null;
}

export function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function eventPostPk(metadata: string | null): string | null {
  try {
    return metadata ? JSON.parse(metadata).postPk ?? null : null;
  } catch {
    return null;
  }
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const item of items) out.set(key(item), [...(out.get(key(item)) ?? []), item]);
  return out;
}

async function deleteCloudinaryAssets(urls: string[]): Promise<void> {
  const assets = urls.map(parseCloudinaryUrl).filter((a) => a !== null);
  let deleted = 0;
  let notFound = 0;
  for (const resourceType of ["image", "video"] as const) {
    const ids = assets.filter((a) => a.resourceType === resourceType).map((a) => a.publicId);
    for (const batch of chunks(ids, 100)) {
      const result = await cloudinary.api.delete_resources(batch, { resource_type: resourceType });
      for (const status of Object.values(result.deleted)) {
        if (status === "deleted") deleted += 1;
        else notFound += 1;
      }
    }
  }
  console.log(`  Cloudinary: ${deleted} deleted, ${notFound} not found`);
}

async function deleteVectors(profileId: string, postPks: string[]): Promise<void> {
  const config = getQdrantConfig();
  if (!isQdrantConfigured(config)) {
    console.log("  Qdrant is not configured, skipping vectors");
    return;
  }
  const client = new QdrantClient({ url: config.url, apiKey: config.apiKey });
  for (const collection of [COLLECTIONS.POST_IMAGES, COLLECTIONS.POST_FACES]) {
    for (const batch of chunks(postPks, 200)) {
      await client.delete(collection, {
        wait: true,
        filter: {
          must: [
            { key: "profileId", match: { value: profileId } },
            { key: "postPk", match: { any: batch } },
          ],
        },
      });
    }
  }
}

async function purgeProfile(
  profileId: string,
  apply: boolean,
  leaveCloudinaryFiles: boolean
): Promise<void> {
  const posts: PostRow[] = await prisma.post.findMany({
    where: { profileId },
    select: { id: true, pk: true, code: true, mediaId: true, scrapeRunId: true, cloudinaryThumbnailUrl: true },
  });
  const { duplicates, unresolved } = findDuplicates(posts);
  const pks = duplicates.map((p) => p.pk);
  const pkSet = new Set(pks);

  const carousel = await prisma.carouselMedia.findMany({
    where: { profileId, postPk: { in: pks } },
    select: { id: true, postPk: true, cloudinaryUrl: true },
  });
  const events = (
    await prisma.accountEvent.findMany({
      where: { profileId, type: "new_post" },
      select: { id: true, metadata: true },
    })
  ).filter((e) => pkSet.has(eventPostPk(e.metadata) ?? ""));

  const perRun = new Map<number, number>();
  for (const { scrapeRunId } of duplicates) {
    if (scrapeRunId != null) perRun.set(scrapeRunId, (perRun.get(scrapeRunId) ?? 0) + 1);
  }
  const runs = await prisma.scrapeRun.findMany({
    where: { id: { in: [...perRun.keys()] } },
    select: { id: true, newPostsAdded: true },
  });
  const newPostsAdded = new Map(runs.map((r) => [r.id, r.newPostsAdded]));

  const cloudinaryUrls = [
    ...duplicates.map((p) => p.cloudinaryThumbnailUrl),
    ...carousel.map((c) => c.cloudinaryUrl),
  ].filter((url) => url !== null);
  const unparsedUrls = cloudinaryUrls.filter((url) => !parseCloudinaryUrl(url)).length;
  const cloudinaryConfig = await getCloudinaryConfigFromDB();
  const hasCloudinary = isCloudinaryConfigured(cloudinaryConfig);

  console.log(`\nProfile ${profileId}: ${posts.length} posts, ${posts.length - duplicates.length} after purge`);
  console.log(`  duplicate posts:        ${duplicates.length}`);
  console.log(`  carousel items:         ${carousel.length}`);
  console.log(`  new_post events:        ${events.length}`);
  console.log(`  Cloudinary files:       ${cloudinaryUrls.length} (credentials ${hasCloudinary ? "found" : "MISSING"}, ${unparsedUrls} unreadable URLs)`);
  console.log(`  Qdrant:                 ${isQdrantConfigured() ? "configured" : "not configured"}`);
  console.log(`  runs to correct:        ${[...perRun].map(([id, n]) => `#${id} (-${n})`).join(", ") || "none"}`);
  console.log(`  mediaIds skipped:       ${unresolved.length}`);
  for (const rows of unresolved.slice(0, 5)) {
    console.log(`    ${rows[0].mediaId}: ${rows.map((r) => r.pk).join(", ")}`);
  }
  for (const post of duplicates.slice(0, 5)) {
    console.log(`  e.g. ${post.mediaId}: removes ${post.pk} from run #${post.scrapeRunId}`);
  }

  if (!apply) return;

  if (cloudinaryUrls.length > 0) {
    if (hasCloudinary) {
      cloudinary.config({
        cloud_name: cloudinaryConfig.cloudName,
        api_key: cloudinaryConfig.apiKey,
        api_secret: cloudinaryConfig.apiSecret,
      });
      await deleteCloudinaryAssets(cloudinaryUrls);
    } else if (leaveCloudinaryFiles) {
      console.log(`  Leaving ${cloudinaryUrls.length} Cloudinary files in place`);
    } else {
      throw new Error(
        `${cloudinaryUrls.length} Cloudinary files would be orphaned and nothing has been deleted. ` +
          "Set CLOUDINARY_* in the environment, or pass --leave-cloudinary-files."
      );
    }
  }
  await deleteVectors(profileId, pks);

  const carouselByPk = groupBy(carousel, (c) => c.postPk);
  const eventsByPk = groupBy(events, (e) => eventPostPk(e.metadata) ?? "");
  let done = 0;

  // Each batch removes a post together with its children and its run count, so
  // an interrupted purge leaves consistent data and can simply be re-run.
  for (const batch of chunks(duplicates, POSTS_PER_TRANSACTION)) {
    const removedPerRun = new Map<number, number>();
    for (const { scrapeRunId } of batch) {
      if (scrapeRunId != null) removedPerRun.set(scrapeRunId, (removedPerRun.get(scrapeRunId) ?? 0) + 1);
    }
    const nextCounts = [...removedPerRun]
      .filter(([id]) => newPostsAdded.has(id))
      .map(([id, removed]) => ({ id, value: Math.max(0, newPostsAdded.get(id)! - removed) }));

    await prisma.$transaction([
      prisma.carouselMedia.deleteMany({
        where: { id: { in: batch.flatMap((p) => (carouselByPk.get(p.pk) ?? []).map((c) => c.id)) } },
      }),
      prisma.accountEvent.deleteMany({
        where: { id: { in: batch.flatMap((p) => (eventsByPk.get(p.pk) ?? []).map((e) => e.id)) } },
      }),
      ...nextCounts.map(({ id, value }) =>
        prisma.scrapeRun.update({ where: { id }, data: { newPostsAdded: value } })
      ),
      prisma.post.deleteMany({ where: { id: { in: batch.map((p) => p.id) } } }),
    ]);

    for (const { id, value } of nextCounts) newPostsAdded.set(id, value);
    done += batch.length;
    console.log(`  deleted ${done}/${duplicates.length}`);
  }

  // Also runs when a re-run finds nothing left, in case the last attempt stopped here.
  await recalculateAccountPostCounts(profileId);
  console.log(`  Deleted ${duplicates.length} duplicate posts, ${posts.length - duplicates.length} remain`);
}

async function main() {
  const apply = process.argv.includes("--apply");
  const leaveCloudinaryFiles = process.argv.includes("--leave-cloudinary-files");
  const profileFlag = process.argv.indexOf("--profile");
  const profileArg = profileFlag !== -1 ? process.argv[profileFlag + 1] : undefined;

  const profileIds = profileArg
    ? [profileArg]
    : (await prisma.profile.findMany({ select: { id: true } })).map((p) => p.id);

  if (apply) {
    const running = await prisma.scrapeRun.count({
      where: { status: "running", profileId: { in: profileIds } },
    });
    if (running > 0) throw new Error(`${running} scrape(s) running. Wait for them to finish.`);
  }

  console.log(apply ? "APPLY: deleting duplicates" : "DRY RUN: nothing will be deleted");
  for (const profileId of profileIds) await purgeProfile(profileId, apply, leaveCloudinaryFiles);
  if (!apply) console.log("\nDry run complete. Add --apply to delete.");
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
