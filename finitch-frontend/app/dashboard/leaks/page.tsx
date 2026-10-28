"use client";
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Bell, Flame, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { clearAuthToken, getAuthToken } from '@/lib/cookies';
interface LeakSummary {
  wealth_leaks?: {
    monthly_impact?: number;
  };
  destiny_summary_log?: string;
  user_profile?: {
    monthly_income?: number;
    rent?: number;
    emis?: number;
    insurance?: number;
  };
}

interface Transaction {
  merchant: string;
  amount: number;
  category: string;
  timestamp: string;
}

export default function NeuralLeaksPage() {
  const [loading, setLoading] = useState(true);
  const [pulseData, setPulseData] = useState<LeakSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const router = useRouter();

  const monthlyImpact = pulseData?.wealth_leaks?.monthly_impact || 0;

  const generateDefaultTrend = (impact: number) => {
    const base = Math.max(impact, 1200);
    return Array.from({ length: 6 }, (_, index) => ({
      month: `M-${5 - index}`,
      leak: Math.max(0, Math.round(base - (index * (base * 0.12))))
    })).reverse();
  };
  
  const leakTrend = useMemo(() => {
    // If we have transaction data, calculate leak trend from actual spending
    if (transactions.length > 0) {
      const monthGroups: Record<string, number> = {};
      const now = new Date();
      
      transactions.forEach((tx) => {
        const txDate = new Date(tx.timestamp);
        const monthDiff = (now.getFullYear() - txDate.getFullYear()) * 12 + (now.getMonth() - txDate.getMonth());
        if (monthDiff >= 0 && monthDiff < 6) {
          const monthKey = `M-${monthDiff}`;
          monthGroups[monthKey] = (monthGroups[monthKey] || 0) + tx.amount;
        }
      });

      // Fill missing months and sort
      const trend = [];
      for (let i = 5; i >= 0; i--) {
        trend.push({
          month: `M-${i}`,
          leak: monthGroups[`M-${i}`] || 0
        });
      }
      return trend.some((t) => t.leak > 0) ? trend : generateDefaultTrend(monthlyImpact);
    }
    
    return generateDefaultTrend(monthlyImpact);
  }, [transactions, monthlyImpact]);

  const fetchLeaks = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        clearAuthToken();
        router.replace('/login');
        return;
      }
      
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8001';
      // Fetch both summary and transaction data
      const [summaryRes, txRes] = await Promise.all([
        fetch(`${apiBase}/dashboard/summary`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${apiBase}/analytics/transactions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (summaryRes.status === 401 || txRes.status === 401) {
        router.replace('/login');
        return;
      }

      const summaryResult = await summaryRes.json();
      const txResult = await txRes.json();
      
      if (summaryRes.ok) setPulseData(summaryResult);
      if (txRes.ok && txResult.history) setTransactions(txResult.history);
    } catch (e) {
      console.error("Telemetry link lost.", e);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void fetchLeaks();
  }, [fetchLeaks]);

  if (loading) return <div className="min-h-screen bg-vaultic-black flex items-center justify-center text-vaultic-muted font-mono text-xs uppercase tracking-widest">Scanning Friction Vectors...</div>;

  return (
    <div className="vaultic-page min-w-0 p-4 sm:p-6 md:p-8 lg:p-12 font-sans">
      <header className="mb-10 lg:mb-14 max-w-7xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-vaultic-orange/10 border border-vaultic-orange/20 rounded-lg flex items-center justify-center text-vaultic-orange">
              <Bell size={16} />
            </div>
            <span className="text-[10px] font-mono tracking-[0.2em] text-vaultic-orange uppercase">Anomaly Detection</span>
          </div>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight uppercase italic text-vaultic-cream">Neural Leaks</h1>
        <p className="text-vaultic-muted text-sm mt-2 italic">Monitored friction channels where passive capital is slipping out of system bounds.</p>
      </header>

      <div className="max-w-7xl min-w-0 space-y-6">
        {/* LEAK STATUS HEADER */}
        <div className={`p-6 sm:p-8 rounded-3xl border ${monthlyImpact > 0 ? 'bg-vaultic-orange/10 border-vaultic-orange/20' : 'bg-vaultic-mint/10 border-vaultic-mint/20'} flex items-start gap-5 sm:gap-6 shadow-2xl`}>
          {monthlyImpact > 0 ? <Flame className="text-vaultic-orange shrink-0" size={36} /> : <CheckCircle2 className="text-vaultic-success shrink-0" size={36} />}
          <div>
            <h3 className="text-lg font-black uppercase tracking-tight italic mb-1">
              {monthlyImpact > 0 ? "Friction Loss Active" : "Zero Leak Optimization Achieved"}
            </h3>
            <p className="text-xs text-vaultic-muted font-light leading-relaxed">
              {monthlyImpact > 0 
                ? `The cognitive agent has isolated structural financial friction. Idle assets are currently experiencing an annualized drag parameter without protective index wrapping.`
                : "System holding vectors are fully deployed across maximum utility yield channels."
              }
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="vaultic-panel rounded-2xl p-5">
            <p className="text-[9px] uppercase tracking-[0.35em] text-vaultic-muted">Leak Velocity</p>
            <p className="text-3xl font-black text-vaultic-cream mt-3">{monthlyImpact > 0 ? `${Math.min(100, Math.round((monthlyImpact / 30000) * 100))}%` : '0%'}</p>
          </div>
          <div className="vaultic-panel rounded-2xl p-5">
            <p className="text-[9px] uppercase tracking-[0.35em] text-vaultic-muted">Monthly Drag</p>
            <p className="text-3xl font-black text-vaultic-orange mt-3">₹{monthlyImpact.toLocaleString('en-IN')}</p>
          </div>
          <div className="vaultic-panel rounded-2xl p-5">
            <p className="text-[9px] uppercase tracking-[0.35em] text-vaultic-muted">Momentum</p>
            <p className="text-3xl font-black text-vaultic-cream mt-3">{monthlyImpact > 0 ? 'Corrective' : 'Stable'}</p>
          </div>
        </div>

        <div className="vaultic-panel p-6 sm:p-8 rounded-3xl space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="text-[9px] font-mono tracking-widest text-vaultic-muted uppercase">Leak Trend</span>
              <h3 className="text-xl font-black uppercase tracking-tight text-vaultic-cream mt-2">Signal Decay</h3>
            </div>
            <span className="text-[10px] uppercase tracking-[0.35em] text-vaultic-orange font-black">Monthly Impact</span>
          </div>
          <div className="h-64 bg-vaultic-black/50 rounded-3xl border border-vaultic-border p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={leakTrend} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="leakGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.85} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.12} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} width={28} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--foreground)' }} />
                <Line type="monotone" dataKey="leak" stroke="var(--accent)" strokeWidth={3} dot={{ r: 3, fill: 'var(--accent)' }} activeDot={{ r: 5, fill: 'var(--foreground)' }} fill="url(#leakGradient)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-vaultic-surface/80 border border-vaultic-border rounded-3xl p-4">
              <p className="text-[9px] uppercase tracking-[0.35em] text-vaultic-muted">Current Loss</p>
              <p className="text-3xl font-black text-vaultic-cream">₹{monthlyImpact.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-vaultic-surface/80 border border-vaultic-border rounded-3xl p-4">
              <p className="text-[9px] uppercase tracking-[0.35em] text-vaultic-muted">Stability</p>
              <p className="text-3xl font-black text-vaultic-cream">{monthlyImpact > 0 ? 'Compromised' : 'Optimal'}</p>
            </div>
          </div>
        </div>

        {/* PROFILE INSIGHT SUMMARY CARD */}
        <div className="vaultic-panel p-6 sm:p-8 rounded-3xl space-y-4">
          <span className="text-[9px] font-mono tracking-widest text-vaultic-muted uppercase block">Profile Core Intelligence Summary</span>
          <p className="text-sm font-light text-vaultic-slate leading-relaxed italic border-l-2 border-vaultic-orange/30 pl-4">
            {pulseData?.destiny_summary_log || 'Awaiting transaction history array streaming...'}
          </p>
        </div>
      </div>
    </div>
  );
}
