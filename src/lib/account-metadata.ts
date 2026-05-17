export const PRIVATE_ACCOUNT_STATUS = "Private Account";

export const ACCOUNT_STATUS_OPTIONS = [
  PRIVATE_ACCOUNT_STATUS,
  "Posts Removed",
  "Post Removed",
  "Account Closed",
  "Blocked",
] as const;

export const EXISTS_ALSO_OPTIONS_SETTING_KEY = "account_exists_also_options";

export function getTodayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
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

export function parseReusableExistsAlsoOptions(value: string | null | undefined) {
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

export function dedupeAndSortTextOptions(options: string[]) {
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
