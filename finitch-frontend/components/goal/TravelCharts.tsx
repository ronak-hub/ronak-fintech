"use client";

import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';

type TravelDestination = {
  continent: string;
  country: string;
  minBudget: number;
  avgDaily: number;
  recommendedDays: number;
};

export default function TravelCharts({ destinations }: { destinations: TravelDestination[] }) {
  const topByBudget = useMemo(() => {
    return [...destinations].sort((a, b) => b.minBudget - a.minBudget).slice(0, 10).map((d) => ({ name: d.country, value: Math.round(d.minBudget / 1000) }));
  }, [destinations]);

  const byContinent = useMemo(() => {
    const map: Record<string, number> = {};
    destinations.forEach((d) => { map[d.continent] = (map[d.continent] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [destinations]);

  const COLORS = ['#06B6D4', '#60A5FA', '#F472B6', '#34D399', '#F59E0B', '#A78BFA'];

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="h-[320px] w-full rounded-[1.5rem] border border-white/6 bg-[#071018] p-4">
        <h3 className="mb-2 text-sm font-bold">Top travel targets (min budget, ₹k)</h3>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={topByBudget} margin={{ top: 8, right: 12, left: 6, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#071421" />
            <XAxis dataKey="name" tick={{ fill: '#94A3B8' }} />
            <YAxis tick={{ fill: '#94A3B8' }} />
            <Tooltip formatter={(v: any) => `${v}k`} />
            <Bar dataKey="value" fill="#06B6D4" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="h-[320px] w-full rounded-[1.5rem] border border-white/6 bg-[#071018] p-4">
        <h3 className="mb-2 text-sm font-bold">Destinations by continent</h3>
        <ResponsiveContainer width="100%" height="90%">
          <PieChart>
            <Pie data={byContinent} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} fill="#8884d8" label>
              {byContinent.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Legend />
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
