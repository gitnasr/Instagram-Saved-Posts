/**
 * Timeline (AccountEvent) filters. The `[profileId, occurredAt]` index has
 * always existed; nothing queried it until now.
 */
import type { AccountEventType, Prisma } from "@prisma/client";
import type { DateRange, FilterDescriptor } from "./filter-registry";

type Where = Prisma.AccountEventWhereInput;
type EventFilter = FilterDescriptor<Where>;

/** Every event type, with labels shared by the account and event filters. */
export const EVENT_TYPE_OPTIONS = [
  { value: "discovered", label: "Discovered" },
  { value: "new_post", label: "New post" },
  { value: "privacy_private", label: "Went private" },
  { value: "privacy_public", label: "Went public" },
  { value: "username_changed", label: "Username changed" },
  { value: "full_name_changed", label: "Full name changed" },
  { value: "verified_gained", label: "Got verified" },
  { value: "verified_lost", label: "Lost verification" },
  { value: "profile_pic_changed", label: "Profile pic changed" },
  { value: "lost", label: "Went missing" },
  { value: "recovered", label: "Recovered" },
  { value: "status_changed", label: "Status changed" },
  { value: "ignored", label: "Ignored" },
  { value: "unignored", label: "Unignored" },
] as const;

export const EVENT_FILTERS = [
  {
    key: "type",
    kind: "multiEnum",
    label: "Event Type",
    group: "Event",
    options: EVENT_TYPE_OPTIONS,
    toWhere: (v) => {
      const list = (Array.isArray(v) ? v : [String(v)]).filter(
        Boolean
      ) as AccountEventType[];
      return list.length > 0 ? { type: { in: list } } : null;
    },
  },
  {
    key: "occurred",
    kind: "dateRange",
    label: "Occurred",
    group: "Event",
    toWhere: (v) => {
      const { from, to } = v as DateRange;
      const clause: Record<string, string> = {};
      if (from) clause.gte = from;
      // ISO strings compare lexicographically, so an inclusive end needs the
      // end-of-day suffix.
      if (to) clause.lte = `${to}T23:59:59`;
      return Object.keys(clause).length > 0 ? { occurredAt: clause } : null;
    },
  },
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
    label: "Detected In Run",
    group: "Source",
    placeholder: "Run number",
    toWhere: (v) => {
      const id = Number(v);
      return Number.isFinite(id) ? { scrapeRunId: id } : null;
    },
    chipLabel: (v) => `Detected in run #${v}`,
  },
] as const satisfies readonly EventFilter[];

export type EventFilterKey = (typeof EVENT_FILTERS)[number]["key"];
export type { EventFilter };
