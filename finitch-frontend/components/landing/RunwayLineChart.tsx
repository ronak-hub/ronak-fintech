"use client";

import React, { useCallback, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Area } from "recharts";

type Pt = { name: string; balance: number; runway: number };

const INIT: Pt[] = [
  { name: "Jan", balance: 4800, runway: 10 },
  { name: "Feb", balance: 5200, runway: 12 },
  { name: "Mar", balance: 5400, runway: 13 },
  { name: "Apr", balance: 6000, runway: 15 },
  { name: "May", balance: 6800, runway: 17 },
  { name: "Jun", balance: 7400, runway: 19 },
];

export default function RunwayLineChart({ className }: { className?: string }) {
  const [data, setData] = useState<Pt[]>(INIT);
  const [showArea, setShowArea] = useState(true);

  const bump = useCallback(() => setData((d) => d.map((p, i) => (i === d.length - 1 ? { ...p, balance: p.balance + 800, runway: Math.round(p.runway + 2) } : p))), []);
  const drop = useCallback(() => setData((d) => d.map((p, i) => (i === d.length - 1 ? { ...p, balance: Math.max(0, p.balance - 1200), runway: Math.max(0, p.runway - 3) } : p))), []);
  const reset = useCallback(() => setData(INIT), []);

  return (
    <div className={`relative h-[320px] w-full min-w-0 min-h-0 overflow-hidden rounded-[2rem] border border-white/6 bg-[#071018] p-3 ${className ?? ""}`}>
      <div className="absolute right-3 top-3 z-30 flex gap-2">
        <button onClick={bump} className="rounded-full bg-vaultic-cyan/10 px-2 py-1 text-xs text-vaultic-cyan">+ Income</button>
        <button onClick={drop} className="rounded-full bg-vaultic-orange/10 px-2 py-1 text-xs text-vaultic-orange">Drop</button>
        <button onClick={() => setShowArea((s) => !s)} className="rounded-full bg-white/5 px-2 py-1 text-xs">Toggle area</button>
        <button onClick={reset} className="rounded-full bg-white/6 px-2 py-1 text-xs">Reset</button>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 16, right: 20, left: 12, bottom: 14 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#071421" />
          <XAxis dataKey="name" tick={{ fill: "#94A3B8" }} />
          <YAxis yAxisId="left" tick={{ fill: "#94A3B8" }} domain={[0, 'dataMax + 2000']} />
          <YAxis yAxisId="right" orientation="right" tick={{ fill: "#F59E0B" }} domain={[0, 'dataMax + 5']} />
          <Tooltip wrapperStyle={{ background: "#061015", borderRadius: 8 }} />
          {showArea && <Area yAxisId="left" type="monotone" dataKey="balance" fill="#0EA5A4" stroke="#0EA5A4" fillOpacity={0.06} />}
          <Line yAxisId="left" type="monotone" dataKey="balance" stroke="#60A5FA" strokeWidth={2} dot={false} />
          <Line yAxisId="right" type="monotone" dataKey="runway" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
