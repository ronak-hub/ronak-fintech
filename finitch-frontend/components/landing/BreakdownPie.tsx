"use client";

import React, { useState } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, PieLabelRenderProps } from "recharts";

const INIT = [
  { name: "Savings", value: 48 },
  { name: "Investments", value: 22 },
  { name: "Expenses", value: 30 },
];

const COLORS = ["#34D399", "#60A5FA", "#F97316"];

export default function BreakdownPie({ className }: { className?: string }) {
  const [data] = useState(INIT);

  const renderLabel = (props: PieLabelRenderProps) => {
    const name = String(props.name ?? '');
    const value = Number(props.value ?? 0) || 0;
    return `${name} — ${value}%`;
  };

  return (
    <div className={`relative h-[320px] w-full min-w-0 min-h-0 overflow-hidden rounded-[2rem] border border-white/6 bg-[#071018] p-4 ${className ?? ""}`}>
      <ResponsiveContainer width="100%" height={320}>
        <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 32 }}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="42%"
            innerRadius={46}
            outerRadius={88}
            paddingAngle={4}
            label={renderLabel}
            labelLine={false}
            stroke="#071018"
            strokeWidth={1}
          >
            {data.map((entry, idx) => (
              <Cell key={entry.name} fill={COLORS[idx % COLORS.length]} stroke="#071018" />
            ))}
          </Pie>
          <Tooltip wrapperStyle={{ background: "#061015", borderRadius: 8 }} formatter={(v: unknown) => `${Number(v as unknown as number) || 0}%`} />
          <Legend verticalAlign="bottom" align="center" wrapperStyle={{ color: "#94A3B8", marginTop: 8 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
