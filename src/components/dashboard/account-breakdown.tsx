"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BadgeCheck, Lock, Globe } from "lucide-react";
import type { AccountBreakdown } from "@/types";

interface AccountBreakdownProps {
  breakdown: AccountBreakdown;
}

function pct(value: number, total: number) {
  if (total === 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

export function AccountBreakdownCard({ breakdown }: AccountBreakdownProps) {
  if (breakdown.total === 0) return null;

  return (
    <Card className="hover:border-hairline-strong transition-all">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Account Visibility Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3.5 rounded-[6px] border border-hairline bg-surface-1/50 p-4 transition-all hover:bg-surface-2">
            <div className="p-2.5 rounded-[6px] bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <BadgeCheck className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono text-ink leading-tight">{breakdown.verified.toLocaleString()}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-semibold text-ink-muted">Verified</span>
                <span className="text-[11px] font-mono text-ink-subtle">
                  ({pct(breakdown.verified, breakdown.total)})
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3.5 rounded-[6px] border border-hairline bg-surface-1/50 p-4 transition-all hover:bg-surface-2">
            <div className="p-2.5 rounded-[6px] bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Lock className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono text-ink leading-tight">{breakdown.private.toLocaleString()}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-semibold text-ink-muted">Private</span>
                <span className="text-[11px] font-mono text-ink-subtle">
                  ({pct(breakdown.private, breakdown.total)})
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3.5 rounded-[6px] border border-hairline bg-surface-1/50 p-4 transition-all hover:bg-surface-2">
            <div className="p-2.5 rounded-[6px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Globe className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono text-ink leading-tight">{breakdown.public.toLocaleString()}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-semibold text-ink-muted">Public</span>
                <span className="text-[11px] font-mono text-ink-subtle">
                  ({pct(breakdown.public, breakdown.total)})
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
