"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTimelineTimestamp } from "@/lib/account-metadata";
import { cn } from "@/lib/utils";
import {
  AtSign,
  BadgeCheck,
  BadgeX,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  EyeOff,
  Eye,
  History,
  Image as ImageIcon,
  Lock,
  Maximize2,
  Minimize2,
  Sparkles,
  Tag,
  Unlock,
  UserPlus,
  UserX,
} from "lucide-react";
import type { AccountEvent } from "@/types";

type EventType = AccountEvent["type"];

const EVENT_META: Record<
  EventType,
  { label: string; icon: typeof AtSign; tone: string }
> = {
  discovered: {
    label: "First discovered",
    icon: UserPlus,
    tone: "text-emerald-400",
  },
  new_post: {
    label: "New saved post",
    icon: ImageIcon,
    tone: "text-amber-400",
  },
  privacy_private: {
    label: "Went private",
    icon: Lock,
    tone: "text-amber-500",
  },
  privacy_public: {
    label: "Went public",
    icon: Unlock,
    tone: "text-emerald-400",
  },
  username_changed: {
    label: "Username changed",
    icon: AtSign,
    tone: "text-purple-400",
  },
  full_name_changed: {
    label: "Display name changed",
    icon: Sparkles,
    tone: "text-purple-400",
  },
  verified_gained: {
    label: "Became verified",
    icon: BadgeCheck,
    tone: "text-blue-400",
  },
  verified_lost: {
    label: "Lost verification",
    icon: BadgeX,
    tone: "text-amber-500",
  },
  profile_pic_changed: {
    label: "Profile picture changed",
    icon: ImageIcon,
    tone: "text-ink-muted",
  },
  lost: {
    label: "Lost from saved posts",
    icon: UserX,
    tone: "text-red-400",
  },
  recovered: {
    label: "Recovered",
    icon: UserPlus,
    tone: "text-emerald-400",
  },
  status_changed: {
    label: "Status changed",
    icon: Tag,
    tone: "text-ink-muted",
  },
  ignored: {
    label: "Marked ignored",
    icon: EyeOff,
    tone: "text-ink-muted",
  },
  unignored: {
    label: "Un-ignored",
    icon: Eye,
    tone: "text-ink-muted",
  },
};

const COMPACT_COUNT = 5;
const PAGE_SIZE = 25;

function parseTakenAt(metadata: string | null): number | null {
  if (!metadata) return null;
  try {
    const parsed = JSON.parse(metadata);
    return typeof parsed?.takenAt === "number" ? parsed.takenAt : null;
  } catch {
    return null;
  }
}

function EventDetail({ event }: { event: AccountEvent }) {
  if (event.type === "username_changed") {
    return (
      <span className="text-xs font-mono">
        @{event.fromValue} &rarr; <span className="font-semibold text-ink">@{event.toValue}</span>
      </span>
    );
  }

  if (event.type === "full_name_changed") {
    return (
      <span className="text-xs font-mono">
        {event.fromValue || "(empty)"} &rarr;{" "}
        <span className="font-semibold text-ink">{event.toValue || "(empty)"}</span>
      </span>
    );
  }

  if (event.type === "status_changed") {
    return (
      <span className="text-xs font-mono">
        {event.fromValue ?? "No status"} &rarr;{" "}
        <span className="font-semibold text-ink">{event.toValue ?? "No status"}</span>
      </span>
    );
  }

  if (event.type === "new_post") {
    const takenAt = parseTakenAt(event.metadata);
    return (
      <span className="text-xs text-ink-muted font-mono flex items-center gap-1.5 flex-wrap mt-0.5">
        <span>
          {takenAt
            ? `Posted ${format(new Date(takenAt * 1000), "MMM d, yyyy")}`
            : "Post details unavailable"}
        </span>
        {event.toValue && (
          <>
            <span>·</span>
            <a
              href={`https://www.instagram.com/p/${event.toValue}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 font-semibold text-ink hover:text-amber-500 hover:underline"
              title="View post on Instagram"
            >
              <span>{event.toValue}</span>
              <ExternalLink className="size-2.5 opacity-70" />
            </a>
          </>
        )}
      </span>
    );
  }

  return null;
}

interface AccountTimelineProps {
  events: AccountEvent[];
  eventsLimit: number;
}

export function AccountTimeline({ events, eventsLimit }: AccountTimelineProps) {
  const [isExtendedEvents, setIsExtendedEvents] = useState(false);
  const [isExtendedWidth, setIsExtendedWidth] = useState(false);
  const [isCardCollapsed, setIsCardCollapsed] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const effectiveVisibleCount = isExtendedEvents
    ? visible
    : Math.min(COMPACT_COUNT, events.length);

  const groups = useMemo(() => {
    const byDay = new Map<string, AccountEvent[]>();
    for (const event of events.slice(0, effectiveVisibleCount)) {
      const day = event.occurredAt.slice(0, 10);
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day)!.push(event);
    }
    return [...byDay.entries()];
  }, [events, effectiveVisibleCount]);

  const truncatedByServer = events.length >= eventsLimit;

  return (
    <Card
      className={cn(
        "hover:border-hairline-strong transition-all",
        isExtendedWidth && "lg:col-span-2"
      )}
    >
      <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3">
        <div className="space-y-0.5 min-w-0">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="size-4 text-amber-500 shrink-0" />
            <span className="truncate">Activity Timeline</span>
          </CardTitle>
          <p className="text-xs text-ink-muted line-clamp-1">
            State transitions and events recorded across all sync operations
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant="secondary" className="font-mono text-[10px]">
            {events.length} events
          </Badge>
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-ink-muted hover:text-ink hover:bg-surface-2"
            onClick={() => setIsExtendedWidth((v) => !v)}
            title={isExtendedWidth ? "Restore split view" : "Extend to full width"}
            aria-label={isExtendedWidth ? "Restore split view" : "Extend to full width"}
          >
            {isExtendedWidth ? (
              <Minimize2 className="size-3.5" />
            ) : (
              <Maximize2 className="size-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-ink-muted hover:text-ink hover:bg-surface-2"
            onClick={() => setIsCardCollapsed((v) => !v)}
            title={isCardCollapsed ? "Expand card" : "Collapse card"}
            aria-label={isCardCollapsed ? "Expand card" : "Collapse card"}
          >
            {isCardCollapsed ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronUp className="size-3.5" />
            )}
          </Button>
        </div>
      </CardHeader>

      {!isCardCollapsed && (
        <CardContent className="space-y-4">
          {events.length === 0 ? (
            <p className="rounded-[6px] border border-dashed border-hairline px-3 py-4 text-xs text-ink-muted text-center font-mono">
              No timeline entries recorded yet.
            </p>
          ) : (
            <>
              {groups.map(([day, dayEvents]) => (
                <div key={day} className="space-y-2">
                  <p className="text-[11px] font-mono font-semibold uppercase tracking-wider text-ink-subtle">
                    {format(new Date(day), "MMMM d, yyyy")}
                  </p>

                  <div className="space-y-1.5">
                    {dayEvents.map((event) => {
                      const meta = EVENT_META[event.type];
                      const Icon = meta.icon;
                      const timestamp = formatTimelineTimestamp(event.occurredAt);

                      return (
                        <div
                          key={event.id}
                          className="flex items-start gap-3 rounded-[6px] border border-hairline bg-surface-1/50 hover:bg-surface-2 px-3 py-2 transition-all"
                        >
                          <div className="p-1 rounded-[4px] bg-surface-2 border border-hairline shrink-0 mt-0.5">
                            <Icon className={`size-3.5 ${meta.tone}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-ink">{meta.label}</span>
                              <span
                                className="text-[10px] font-mono text-ink-subtle"
                                title={timestamp.absolute}
                              >
                                {timestamp.relative || timestamp.absolute}
                              </span>
                            </div>
                            <EventDetail event={event} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {events.length > COMPACT_COUNT && (
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  {!isExtendedEvents ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs font-semibold hover:bg-surface-2"
                      onClick={() => setIsExtendedEvents(true)}
                    >
                      <ChevronDown className="mr-1.5 size-3.5" />
                      Extend timeline ({events.length - COMPACT_COUNT} more)
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs font-semibold hover:bg-surface-2"
                        onClick={() => setIsExtendedEvents(false)}
                      >
                        <ChevronUp className="mr-1.5 size-3.5" />
                        Collapse timeline
                      </Button>
                      {visible < events.length && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs font-semibold hover:bg-surface-2"
                          onClick={() => setVisible((v) => v + PAGE_SIZE)}
                        >
                          Load more events ({events.length - visible} remaining)
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}

              {isExtendedEvents && visible >= events.length && truncatedByServer && (
                <p className="text-center text-[11px] font-mono text-ink-subtle">
                  Showing the {eventsLimit} most recent entries.
                </p>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
