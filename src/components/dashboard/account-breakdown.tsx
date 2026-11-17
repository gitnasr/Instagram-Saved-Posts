"use client";

import { Stat } from "@/components/ui/stat";
import type { AccountBreakdown } from "@/types";

interface AccountBreakdownProps {
  breakdown: AccountBreakdown;
}

function pct(value: number, total: number) {
  if (total === 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

/** Visibility split as three plain figures (rendered inside ActivityCard). */
export function AccountBreakdownCard({ breakdown }: AccountBreakdownProps) {
  const items = [
    { label: "Verified", value: breakdown.verified },
    { label: "Private", value: breakdown.private },
    { label: "Public", value: breakdown.public },
  ];

  return (
    <div className="grid grid-cols-3 gap-4 py-2">
      {items.map(({ label, value }) => (
        <Stat
          key={label}
          label={label}
          value={value.toLocaleString()}
          hint={pct(value, breakdown.total)}
        />
      ))}
    </div>
  );
}
