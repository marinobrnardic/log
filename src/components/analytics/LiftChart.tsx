"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnalyticsPoint } from "@/lib/domain/analytics";
import { formatChartDate } from "@/lib/format";

interface Props {
  title: string;
  points: AnalyticsPoint[];
  yUnit?: string;
}

export function LiftChart({ title, points, yUnit }: Props) {
  return (
    <div className="bg-(--color-bg-surface) rounded-lg p-3 space-y-2">
      <h4 className="text-sm font-medium">{title}</h4>
      {points.length === 0 ? (
        <p className="text-(--color-text-muted) text-sm py-6 text-center">
          No data yet — complete a workout to see progress
        </p>
      ) : (
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points.map((p) => ({ ...p, label: formatChartDate(p.date) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
              <XAxis
                dataKey="label"
                stroke="#A1A1AA"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#A1A1AA"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={40}
                domain={["auto", "auto"]}
              />
              <Tooltip
                contentStyle={{
                  background: "#18181B",
                  border: "1px solid #27272A",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "#FAFAFA",
                }}
                labelStyle={{ color: "#A1A1AA" }}
                formatter={(v: number) => [`${round2(v)}${yUnit ? ` ${yUnit}` : ""}`, ""]}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#22C55E"
                strokeWidth={2}
                dot={{ r: 3, fill: "#22C55E" }}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
