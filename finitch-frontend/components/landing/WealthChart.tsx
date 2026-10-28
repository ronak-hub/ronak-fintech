"use client";

import React, { useCallback, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

type Point = { name: string; balance: number; projection: number };

const INITIAL_DATA: Point[] = [
  { name: "Jan", balance: 4800, projection: 5200 },
  { name: "Feb", balance: 5200, projection: 5600 },
  { name: "Mar", balance: 5400, projection: 6000 },
  { name: "Apr", balance: 6000, projection: 6400 },
  { name: "May", balance: 6800, projection: 7200 },
  { name: "Jun", balance: 7400, projection: 8200 },
];

export default function WealthChart({ className }: { className?: string }) {
  const [data, setData] = useState<Point[]>(INITIAL_DATA);
  const [showProjection, setShowProjection] = useState(true);

  const addIncome = useCallback(() => {
    setData((d) => {
      const next = d.map((p, i) => (i === d.length - 1 ? { ...p, balance: p.balance + 500, projection: p.projection + 700 } : p));
      return next;
    });
  }, []);

  const simulateDrop = useCallback(() => {
    setData((d) => d.map((p, i) => (i === d.length - 1 ? { ...p, balance: Math.max(0, p.balance - 800), projection: p.projection - 500 } : p)));
  }, []);

  const reset = useCallback(() => setData(INITIAL_DATA), []);

  const extendMonth = useCallback(() => {
    setData((d) => {
      const last = d[d.length - 1];
      const nextName = `M${d.length + 1}`;
      return [...d, { name: nextName, balance: Math.round(last.balance * 1.05), projection: Math.round(last.projection * 1.06) }];
    });
  }, []);

  return (
    <div className={`relative h-[320px] w-full min-w-0 min-h-0 overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b1018] sm:h-[380px] ${className ?? ""}`}>
      <div className="absolute right-4 top-4 z-40 flex gap-2 pointer-events-auto">
        <button onClick={addIncome} className="rounded-full bg-vaultic-cyan/10 px-3 py-1 text-sm text-vaultic-cyan hover:bg-vaultic-cyan/20">+ Income</button>
        <button onClick={simulateDrop} className="rounded-full bg-vaultic-orange/10 px-3 py-1 text-sm text-vaultic-orange hover:bg-vaultic-orange/20">Simulate drop</button>
        <button onClick={() => setShowProjection((s) => !s)} className="rounded-full bg-white/5 px-3 py-1 text-sm text-white/80 hover:bg-white/10">{showProjection ? 'Hide' : 'Show'} projection</button>
        <button onClick={extendMonth} className="rounded-full bg-white/5 px-3 py-1 text-sm text-white/80 hover:bg-white/10">Add month</button>
        <button onClick={reset} className="rounded-full bg-white/6 px-3 py-1 text-sm text-white/60 hover:bg-white/12">Reset</button>
      </div>

      <div className="h-full p-4 min-w-0 min-h-0">
        <ResponsiveContainer width="100%" height={320} minHeight={320}>
          <ComposedChart data={data} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#0f1724" />
            <XAxis dataKey="name" tick={{ fill: "#9CA3AF" }} />
            <YAxis tick={{ fill: "#9CA3AF" }} />
            <Tooltip wrapperStyle={{ background: "#0b0f16", borderRadius: 8 }} contentStyle={{ border: "none" }} />
            <Legend wrapperStyle={{ color: "#9CA3AF" }} />
            <Bar dataKey="balance" fill="#4CC9F0" radius={[6, 6, 0, 0]} barSize={18} />
            {showProjection && <Line type="monotone" dataKey="projection" stroke="#2DD4A4" strokeWidth={3} dot={{ r: 3 }} />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
