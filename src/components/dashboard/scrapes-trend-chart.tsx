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
    color: "var(--chart-1)",
  },
  newAccountsFound: {
    label: "New Accounts",
    color: "var(--chart-2)",
  },
};

export function ScrapesTrendChart({ data }: ScrapesTrendChartProps) {
  if (data.length === 0) return null;

  const chartData = data.map((point) => ({
    ...point,
    date: format(new Date(point.startedAt), "MMM d"),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scrapes Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={2}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
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
                fill="var(--chart-1)"
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="newAccountsFound"
                fill="var(--chart-2)"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
