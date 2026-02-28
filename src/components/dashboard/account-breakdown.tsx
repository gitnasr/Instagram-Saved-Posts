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
    <Card>
      <CardHeader>
        <CardTitle>Account Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col items-center gap-1 rounded-lg border p-3 text-center">
            <BadgeCheck className="h-5 w-5 text-blue-500" />
            <p className="text-2xl font-bold">{breakdown.verified}</p>
            <p className="text-xs font-medium">Verified</p>
            <p className="text-xs text-muted-foreground">
              {pct(breakdown.verified, breakdown.total)}
            </p>
          </div>

          <div className="flex flex-col items-center gap-1 rounded-lg border p-3 text-center">
            <Lock className="h-5 w-5 text-amber-500" />
            <p className="text-2xl font-bold">{breakdown.private}</p>
            <p className="text-xs font-medium">Private</p>
            <p className="text-xs text-muted-foreground">
              {pct(breakdown.private, breakdown.total)}
            </p>
          </div>

          <div className="flex flex-col items-center gap-1 rounded-lg border p-3 text-center">
            <Globe className="h-5 w-5 text-green-500" />
            <p className="text-2xl font-bold">{breakdown.public}</p>
            <p className="text-xs font-medium">Public</p>
            <p className="text-xs text-muted-foreground">
              {pct(breakdown.public, breakdown.total)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
