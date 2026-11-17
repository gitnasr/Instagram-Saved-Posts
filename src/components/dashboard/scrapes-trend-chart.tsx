"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import type { ScrapeTrendPoint } from "@/types";

interface ScrapesTrendChartProps {
  data: ScrapeTrendPoint[];
}

const chartConfig = {
  newPostsAdded: {
    label: "New Posts",
    color: "#f59e0b",
  },
  newAccountsFound: {
    label: "New Accounts",
    color: "#71717a",
  },
};

/** Chart body only. Loaded on demand by ActivityCard so Recharts stays out of the first load. */
export function ScrapesTrendChart({ data }: ScrapesTrendChartProps) {
  const chartData = data.map((point) => ({
    ...point,
    date: format(new Date(point.startedAt), "MMM d"),
  }));

  return (
    <div>
      <div className="mb-2 flex items-center gap-4 text-xs text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-amber-500" />
          New posts
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-zinc-500" />
          New creators
        </span>
      </div>
      <ChartContainer config={chartConfig} className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barGap={4}>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: "#71717a" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#71717a" }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => [
                    value,
                    chartConfig[name as keyof typeof chartConfig]?.label ?? name,
                  ]}
                />
              }
            />
            <Bar dataKey="newPostsAdded" fill="#f59e0b" radius={[3, 3, 0, 0]} />
            <Bar dataKey="newAccountsFound" fill="#71717a" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}
