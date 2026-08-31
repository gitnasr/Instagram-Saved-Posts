/**
 * Post filters. Posts had no query surface at all before this — the
 * `[profileId, mediaType]` and `[profileId, takenAt]` indexes existed but
 * nothing used them.
 */
import type { Prisma } from "@prisma/client";
import type {
  DateRange,
  FilterDescriptor,
  NumberRange,
} from "./filter-registry";

type Where = Prisma.PostWhereInput;
type PostFilter = FilterDescriptor<Where>;

const insensitive = { mode: "insensitive" } as const;

/** Instagram media_type values, shared with the account-side post filters. */
export const MEDIA_TYPE_OPTIONS = [
  { value: "1", label: "Image" },
  { value: "2", label: "Video / Reel" },
  { value: "8", label: "Carousel" },
] as const;

/** `takenAt` is a unix timestamp in seconds, so dates convert rather than compare. */
function toEpochSeconds(date: string, endOfDay: boolean): number | null {
  const ms = Date.parse(`${date}T${endOfDay ? "23:59:59" : "00:00:00"}Z`);
  return Number.isNaN(ms) ? null : Math.floor(ms / 1000);
}

function numberRange(
  key: string,
  label: string,
  field: "likeCount" | "commentCount",
  group: string
): PostFilter & { key: string } {
  return {
    key,
    kind: "numberRange",
    label,
    group,
    toWhere: (v) => {
      const { min, max } = v as NumberRange;
      const clause: Record<string, number> = {};
      if (min != null) clause.gte = min;
      if (max != null) clause.lte = max;
      return Object.keys(clause).length > 0 ? ({ [field]: clause } as Where) : null;
    },
  };
}

export const POST_FILTERS = [
  {
    key: "caption",
    kind: "text",
    label: "Caption Contains",
    group: "Content",
    placeholder: "Search captions",
    toWhere: (v) =>
      String(v).trim()
        ? { captionText: { contains: String(v), ...insensitive } }
        : null,
  },
  {
    key: "mediaType",
    kind: "multiEnum",
    label: "Media Type",
    group: "Content",
    options: MEDIA_TYPE_OPTIONS,
    toWhere: (v) => {
      const list = (Array.isArray(v) ? v : [String(v)])
        .map(Number)
        .filter(Number.isFinite);
      return list.length > 0 ? { mediaType: { in: list } } : null;
    },
  },
  {
    key: "takenAt",
    kind: "dateRange",
    label: "Published",
    group: "Content",
    toWhere: (v) => {
      const { from, to } = v as DateRange;
      const clause: { gte?: number; lte?: number } = {};
      if (from) {
        const s = toEpochSeconds(from, false);
        if (s != null) clause.gte = s;
      }
      if (to) {
        const s = toEpochSeconds(to, true);
        if (s != null) clause.lte = s;
      }
      return Object.keys(clause).length > 0 ? { takenAt: clause } : null;
    },
  },
  numberRange("likeCount", "Likes", "likeCount", "Engagement"),
  numberRange("commentCount", "Comments", "commentCount", "Engagement"),
  {
    key: "accountPk",
    kind: "multiEnum",
    label: "Account",
    group: "Source",
    dynamicOptions: true,
    options: [],
    toWhere: (v) => {
      const list = (Array.isArray(v) ? v : [String(v)]).filter(Boolean);
      return list.length > 0 ? { accountPk: { in: list } } : null;
    },
  },
  {
    key: "scrapeRunId",
    kind: "number",
    label: "Added In Run",
    group: "Source",
    placeholder: "Run number",
    toWhere: (v) => {
      const id = Number(v);
      return Number.isFinite(id) ? { scrapeRunId: id } : null;
    },
    chipLabel: (v) => `Added in run #${v}`,
  },
  {
    key: "hasCarousel",
    kind: "tristate",
    label: "Carousel",
    group: "Media",
    options: [
      { value: "yes", label: "Multi-image posts" },
      { value: "no", label: "Single media" },
    ],
    toWhere: (v) =>
      v === "yes"
        ? { carouselMediaCount: { gt: 1 } }
        : v === "no"
          ? {
              OR: [
                { carouselMediaCount: null },
                { carouselMediaCount: { isSet: false } },
                { carouselMediaCount: { lte: 1 } },
              ],
            }
          : null,
  },
  {
    key: "hasCloudinaryThumbnail",
    kind: "tristate",
    label: "Cloudinary Backup",
    group: "Media",
    hint: "Finds posts the Cloudinary sync has not reached yet.",
    options: [
      { value: "yes", label: "Backed up" },
      { value: "no", label: "Not backed up" },
    ],
    toWhere: (v) =>
      v === "yes"
        ? { cloudinaryThumbnailUrl: { not: null } }
        : v === "no"
          ? {
              OR: [
                { cloudinaryThumbnailUrl: null },
                { cloudinaryThumbnailUrl: { isSet: false } },
              ],
            }
          : null,
  },
] as const satisfies readonly PostFilter[];

export type PostFilterKey = (typeof POST_FILTERS)[number]["key"];

const SORT_FIELDS = {
  taken_at: "takenAt",
  likes: "likeCount",
  comments: "commentCount",
  created_at: "createdAt",
} as const;

export function buildPostOrderBy(
  sort: string,
  order: string
): Prisma.PostOrderByWithRelationInput {
  const dir: Prisma.SortOrder = order === "asc" ? "asc" : "desc";
  const field = SORT_FIELDS[sort as keyof typeof SORT_FIELDS] ?? "takenAt";
  return { [field]: dir };
}

export type { PostFilter };
