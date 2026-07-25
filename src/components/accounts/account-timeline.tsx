"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTimelineTimestamp } from "@/lib/account-metadata";
import {
  AtSign,
  BadgeCheck,
  BadgeX,
  EyeOff,
  Eye,
  Image as ImageIcon,
  Lock,
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
    tone: "text-emerald-600 dark:text-emerald-400",
  },
  new_post: {
    label: "New saved post",
    icon: ImageIcon,
    tone: "text-sky-600 dark:text-sky-400",
  },
  privacy_private: {
    label: "Went private",
    icon: Lock,
    tone: "text-amber-600 dark:text-amber-400",
  },
  privacy_public: {
    label: "Went public",
    icon: Unlock,
    tone: "text-emerald-600 dark:text-emerald-400",
  },
  username_changed: {
    label: "Username changed",
    icon: AtSign,
    tone: "text-violet-600 dark:text-violet-400",
  },
  full_name_changed: {
    label: "Display name changed",
    icon: Sparkles,
    tone: "text-violet-600 dark:text-violet-400",
  },
  verified_gained: {
    label: "Became verified",
    icon: BadgeCheck,
    tone: "text-sky-600 dark:text-sky-400",
  },
  verified_lost: {
    label: "Lost verification",
    icon: BadgeX,
    tone: "text-amber-600 dark:text-amber-400",
  },
  profile_pic_changed: {
    label: "Profile picture changed",
    icon: ImageIcon,
    tone: "text-muted-foreground",
  },
  lost: {
    label: "Lost from saved posts",
    icon: UserX,
    tone: "text-destructive",
  },
  recovered: {
    label: "Recovered",
    icon: UserPlus,
    tone: "text-emerald-600 dark:text-emerald-400",
  },
  status_changed: {
    label: "Status changed",
    icon: Tag,
    tone: "text-muted-foreground",
  },
  ignored: {
    label: "Marked ignored",
    icon: EyeOff,
    tone: "text-muted-foreground",
  },
  unignored: {
    label: "Un-ignored",
    icon: Eye,
    tone: "text-muted-foreground",
  },
};

const INITIAL_VISIBLE = 25;
const PAGE_SIZE = 50;

function parseTakenAt(metadata: string | null): number | null {
  if (!metadata) return null;
  try {
    const parsed = JSON.parse(metadata);
    return typeof parsed?.takenAt === "number" ? parsed.takenAt : null;
  } catch {
    return null;
  }
}

/** The change itself, rendered per event type. */
function EventDetail({ event }: { event: AccountEvent }) {
  if (event.type === "username_changed") {
    return (
      <span className="text-sm">
        @{event.fromValue} &rarr; <span className="font-medium">@{event.toValue}</span>
      </span>
    );
  }

  if (event.type === "full_name_changed") {
    return (
      <span className="text-sm">
        {event.fromValue || "(empty)"} &rarr;{" "}
        <span className="font-medium">{event.toValue || "(empty)"}</span>
      </span>
    );
  }

  if (event.type === "status_changed") {
    return (
      <span className="text-sm">
        {event.fromValue ?? "No status"} &rarr;{" "}
        <span className="font-medium">{event.toValue ?? "No status"}</span>
      </span>
    );
  }

  if (event.type === "new_post") {
    const takenAt = parseTakenAt(event.metadata);
    return (
      <span className="text-sm text-muted-foreground">
        {takenAt
          ? `Posted ${format(new Date(takenAt * 1000), "PPP")}`
          : "Post details unavailable"}
        {event.toValue ? ` · ${event.toValue}` : ""}
      </span>
    );
  }

  return null;
}

interface AccountTimelineProps {
  events: AccountEvent[];
  /** Server-side cap; a full page means older entries exist but were trimmed. */
  eventsLimit: number;
}

export function AccountTimeline({ events, eventsLimit }: AccountTimelineProps) {
  const [visible, setVisible] = useState(INITIAL_VISIBLE);

  // Grouped by calendar day, newest first. The API already sorts descending.
  const groups = useMemo(() => {
    const byDay = new Map<string, AccountEvent[]>();
    for (const event of events.slice(0, visible)) {
      const day = event.occurredAt.slice(0, 10);
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day)!.push(event);
    }
    return [...byDay.entries()];
  }, [events, visible]);

  const truncatedByServer = events.length >= eventsLimit;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">Timeline</CardTitle>
            <p className="text-sm text-muted-foreground">
              Recorded automatically on every scrape and manual edit.
            </p>
          </div>
          <Badge variant="outline">{events.length}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {events.length === 0 ? (
          <p className="rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">
            No timeline entries yet. Privacy, verification and name changes are
            recorded from the next scrape onwards.
          </p>
        ) : (
          <>
            {groups.map(([day, dayEvents]) => (
              <div key={day} className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {format(new Date(day), "PPP")}
                </p>

                <div className="space-y-2">
                  {dayEvents.map((event) => {
                    const meta = EVENT_META[event.type];
                    const Icon = meta.icon;
                    const timestamp = formatTimelineTimestamp(event.occurredAt);

                    return (
                      <div
                        key={event.id}
                        className="flex items-start gap-3 rounded-lg border bg-muted/20 px-3 py-2"
                      >
                        <Icon className={`mt-0.5 size-4 shrink-0 ${meta.tone}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-medium">{meta.label}</span>
                            <span
                              className="text-xs text-muted-foreground"
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

            {visible < events.length && (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVisible((v) => v + PAGE_SIZE)}
                >
                  Show more
                </Button>
              </div>
            )}

            {visible >= events.length && truncatedByServer && (
              <p className="text-center text-xs text-muted-foreground">
                Showing the {eventsLimit} most recent entries.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
