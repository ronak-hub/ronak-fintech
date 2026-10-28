"use client";

import React, { useEffect, useMemo, useState } from 'react';
import * as Recharts from 'recharts';
import { getEffectiveSavingsAmount, readStoredWizardData } from '@/lib/finance';

const COLORS = ['#F59E0B', '#22C55E', '#38BDF8', '#A78BFA', '#F97316'];

const formatCurrency = (value: number | string) => {
  const amount = Number(value) || 0;
  if (Math.abs(amount) >= 1_000_000) return `₹${(amount / 1_000_000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1_000) return `₹${Math.round(amount / 1000)}k`;
  return `₹${amount}`;
};

export default function DashboardComposedChart() {
  const [dnaData, setDnaData] = useState<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const readStored = () => {
      try {
        const stored = readStoredWizardData();
        if (!stored) {
          setDnaData(null);
          return;
        }
        setDnaData(stored);
      } catch {
        setDnaData(null);
      }
    };

    readStored();
    window.addEventListener('vaulticDnaInputsUpdated', readStored);
    return () => window.removeEventListener('vaulticDnaInputsUpdated', readStored);
  }, []);

  const chartData = useMemo(() => {
    if (!dnaData) return [];
    const income = Number(dnaData.monthly_income) || 0;
    const expenses = Number(dnaData.fixed_expenses) || 0;
    const savings = getEffectiveSavingsAmount(dnaData);
    return [
      { name: 'Current', income, expenses, savings },
      { name: 'Monthly +2%', income: Math.round(income * 1.02), expenses: Math.round(expenses * 1.01), savings: Math.round(savings * 1.05) },
      { name: 'Monthly +4%', income: Math.round(income * 1.04), expenses: Math.round(expenses * 1.02), savings: Math.round(savings * 1.12) },
      { name: 'Monthly +6%', income: Math.round(income * 1.06), expenses: Math.round(expenses * 1.03), savings: Math.round(savings * 1.2) },
    ];
  }, [dnaData]);

  const [liveChartData, setLiveChartData] = useState<any[]>(chartData.length ? chartData : []);

  useEffect(() => {
    setLiveChartData(chartData);
    if (!chartData.length) return undefined;
    const interval = setInterval(() => {
      setLiveChartData((prev) => prev.map((point, idx) => ({ ...point, savings: Math.max(0, Math.round((point.savings || 0) * (1 + (Math.random() - 0.5) * 0.06))) })));
    }, 1750);
    return () => clearInterval(interval);
  }, [chartData]);

  if (!liveChartData.length) {
    return <div className="h-[300px] flex items-center justify-center text-sm text-vaultic-muted">No data to chart</div>;
  }

  return (
    <Recharts.ResponsiveContainer width="100%" height="100%">
      <Recharts.ComposedChart data={liveChartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <Recharts.CartesianGrid strokeDasharray="3 3" stroke="#0F172A" />
        <Recharts.XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 12 }} />
        <Recharts.YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 12 }} tickFormatter={formatCurrency} width={80} domain={[0, 'dataMax']} />
        <Recharts.YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 12 }} tickFormatter={formatCurrency} width={80} domain={[0, 'dataMax']} />
        <Recharts.Tooltip wrapperStyle={{ background: '#061015', borderRadius: 8, border: '1px solid #1e293b' }} formatter={(value: unknown) => `₹${(Number(value) || 0).toLocaleString('en-IN')}`} labelFormatter={(label) => `Period: ${label}`} />
        <Recharts.Legend wrapperStyle={{ color: '#94A3B8' }} />
        <Recharts.Line yAxisId="left" type="monotone" dataKey="income" name="Income" stroke="#22C55E" strokeWidth={3} dot={{ r: 4, fill: '#22C55E' }} activeDot={{ r: 6 }} />
        <Recharts.Line yAxisId="right" type="monotone" dataKey="expenses" name="Expenses" stroke="#F97316" strokeWidth={3} dot={{ r: 4, fill: '#F97316' }} activeDot={{ r: 6 }} />
        <Recharts.Area yAxisId="right" type="monotone" dataKey="savings" name="Savings" stroke="#38BDF8" strokeWidth={3} fill="url(#savingsGradient)" fillOpacity={1} dot={{ r: 4, fill: '#38BDF8' }} activeDot={{ r: 6 }} isAnimationActive={false} />
      </Recharts.ComposedChart>
    </Recharts.ResponsiveContainer>
  );
}
