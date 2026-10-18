import { format, formatDistanceToNow } from "date-fns";

export const PRIVATE_ACCOUNT_STATUS = "Private Account";

export const ACCOUNT_STATUS_OPTIONS = [
  PRIVATE_ACCOUNT_STATUS,
  "Posts Removed",
  "Post Removed",
  "Account Closed",
  "Blocked",
] as const;

export const ACCOUNT_STATUS_OPTIONS_SETTING_KEY = "account_status_options";
export const EXISTS_ALSO_OPTIONS_SETTING_KEY = "account_exists_also_options";

export function getTodayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

/** Absolute + relative rendering of an ISO timestamp for timeline rows. */
export function formatTimelineTimestamp(value: string) {
  try {
    const parsed = new Date(value);
    return {
      absolute: format(parsed, "PPP p"),
      relative: formatDistanceToNow(parsed, { addSuffix: true }),
    };
  } catch {
    return { absolute: value, relative: "" };
  }
}

export function normalizeDateInput(value: unknown) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

export function normalizeOptionalText(value: unknown) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseReusableTextOptions(value: string | null | undefined) {
  if (!value) return [] as string[];

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [] as string[];

    return dedupeAndSortTextOptions(
      parsed.filter((item): item is string => typeof item === "string")
    );
  } catch {
    return [] as string[];
  }
}

export function parseReusableStatusOptions(value: string | null | undefined) {
  return parseReusableTextOptions(value);
}

export function parseReusableExistsAlsoOptions(value: string | null | undefined) {
  return parseReusableTextOptions(value);
}

export function dedupeAndSortTextOptions(options: readonly string[]) {
  const normalizedByKey = new Map<string, string>();

  for (const option of options) {
    const trimmed = option.trim();
    if (!trimmed) continue;

    const key = trimmed.toLocaleLowerCase();
    if (!normalizedByKey.has(key)) {
      normalizedByKey.set(key, trimmed);
    }
  }

  return [...normalizedByKey.values()].sort((left, right) =>
    left.localeCompare(right, undefined, { sensitivity: "base" })
  );
}

export function findMatchingTextOption(
  options: readonly string[],
  candidate: string | null | undefined
) {
  const trimmed = candidate?.trim();
  if (!trimmed) return null;

  const targetKey = trimmed.toLocaleLowerCase();
  return (
    options.find((option) => option.trim().toLocaleLowerCase() === targetKey) ??
    null
  );
}

/**
 * Keeps built-in `ACCOUNT_STATUS_OPTIONS` in their fixed order first, followed
 * by deduplicated and case-insensitively sorted custom status options.
 */
export function mergeStatusOptions(...sources: (readonly string[])[]) {
  const builtInKeys = new Set(
    ACCOUNT_STATUS_OPTIONS.map((option) => option.toLocaleLowerCase())
  );

  const customCandidates: string[] = [];
  for (const source of sources) {
    for (const item of source) {
      const trimmed = item.trim();
      if (!trimmed) continue;
      if (builtInKeys.has(trimmed.toLocaleLowerCase())) continue;
      customCandidates.push(trimmed);
    }
  }

  return [
    ...ACCOUNT_STATUS_OPTIONS,
    ...dedupeAndSortTextOptions(customCandidates),
  ];
}
