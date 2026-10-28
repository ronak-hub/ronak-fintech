"use client";

import React, { useCallback, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, Cell } from "recharts";

type Cat = { name: string; food: number; bills: number; entertainment: number };

const INIT: Cat[] = [
  { name: "Jan", food: 400, bills: 600, entertainment: 200 },
  { name: "Feb", food: 380, bills: 620, entertainment: 240 },
  { name: "Mar", food: 420, bills: 580, entertainment: 260 },
  { name: "Apr", food: 460, bills: 640, entertainment: 300 },
  { name: "May", food: 500, bills: 700, entertainment: 320 },
  { name: "Jun", food: 520, bills: 760, entertainment: 340 },
];

const COLORS = ["#06B6D4", "#60A5FA", "#F472B6"];

export default function CategoryBarChart({ className }: { className?: string }) {
  const [data, setData] = useState<Cat[]>(INIT);

  const randomize = useCallback(() => {
    setData((d) => d.map((row) => ({ ...row, food: Math.round(row.food * (0.8 + Math.random() * 0.6)), bills: Math.round(row.bills * (0.8 + Math.random() * 0.6)), entertainment: Math.round(row.entertainment * (0.6 + Math.random() * 0.8)) })));
  }, []);

  return (
    <div className={`relative h-[220px] w-full min-w-0 min-h-0 overflow-hidden rounded-[1.5rem] border border-white/6 bg-[#071018] p-3 ${className ?? ""}`}>
      <div className="absolute right-3 top-3 z-30 flex gap-2">
        <button onClick={randomize} className="rounded-full bg-vaultic-cyan/10 px-2 py-1 text-xs text-vaultic-cyan">Randomize</button>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 10, right: 18, left: 10, bottom: 14 }}>
          <XAxis dataKey="name" tick={{ fill: "#94A3B8" }} />
          <YAxis tick={{ fill: "#94A3B8" }} />
          <Tooltip wrapperStyle={{ background: "#061015", borderRadius: 8 }} />
          <Legend wrapperStyle={{ color: "#94A3B8" }} verticalAlign="top" height={24} />
          <Bar dataKey="food" stackId="a" name="Food" fill={COLORS[0]}>
            {data.map((_, idx) => (
              <Cell key={idx} fill={COLORS[0]} />
            ))}
          </Bar>
          <Bar dataKey="bills" stackId="a" name="Bills" fill={COLORS[1]} />
          <Bar dataKey="entertainment" stackId="a" name="Entertainment" fill={COLORS[2]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
