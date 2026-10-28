"use client";

import React from 'react';
import * as Recharts from 'recharts';

type Props = { data: any };

export default function BarSavingsChart({ data }: Props) {
  return (
    <Recharts.ResponsiveContainer width="100%" height="100%">
      <Recharts.BarChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
        <Recharts.CartesianGrid strokeDasharray="3 3" stroke="#0F172A" />
        <Recharts.XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 12 }} />
        <Recharts.YAxis tick={{ fill: '#94A3B8', fontSize: 12 }} />
        <Recharts.Tooltip wrapperStyle={{ background: '#061015', borderRadius: 8, border: '1px solid #1e293b' }} formatter={(value: unknown) => [`₹${(Number(value) || 0).toLocaleString('en-IN')}`, 'Savings']} />
        <Recharts.Legend wrapperStyle={{ color: '#94A3B8' }} />
        <Recharts.Bar dataKey="savings" name="Savings" fill="#22C55E" />
      </Recharts.BarChart>
    </Recharts.ResponsiveContainer>
  );
}
