"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export function ScrapesTrendChart({ data }: ScrapesTrendChartProps) {
  if (data.length === 0) return null;

  const chartData = data.map((point) => ({
    ...point,
    date: format(new Date(point.startedAt), "MMM d"),
  }));

  return (
    <Card className="hover:border-hairline-strong transition-all">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-0.5">
          <CardTitle className="text-base font-semibold">Activity Trend</CardTitle>
          <p className="text-xs text-ink-muted">Posts added and new accounts discovered per sync</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-amber-500" />
            <span className="text-ink-muted">New Posts</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-zinc-500" />
            <span className="text-ink-muted">New Creators</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={4}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#71717a" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#71717a" }}
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
              <Bar
                dataKey="newPostsAdded"
                fill="#f59e0b"
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="newAccountsFound"
                fill="#71717a"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
