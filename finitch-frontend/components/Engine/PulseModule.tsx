"use client";
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { getAuthToken } from '@/lib/cookies';

interface PulseModuleData {
  overall_health_score?: number;
  daily_safe_budget?: number;
  nudges?: string[];
  streak_data?: { current_streak?: number };
}

export default function PulseModule() {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<PulseModuleData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPulse = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        setData({
          overall_health_score: 82,
          daily_safe_budget: 2500,
          nudges: ['Subscription: Netflix renewed ₹199', 'Coffee: Starbucks ₹350', 'Impulse: Amazon ₹1,200'],
          streak_data: { current_streak: 7 },
        });
        setLoading(false);
        return;
      }

      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8001';
      const response = await fetch(`${apiBase}/dashboard/summary`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error();
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Brain Sync Error:', error);
      setData({
        overall_health_score: 82,
        daily_safe_budget: 2500,
        nudges: ['Subscription: Netflix renewed ₹199', 'Coffee: Starbucks ₹350', 'Impulse: Amazon ₹1,200'],
        streak_data: { current_streak: 7 },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchPulse();
    const interval = setInterval(fetchPulse, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!mounted || loading) {
    return (
      <div className="min-h-[360px] w-full rounded-[3rem] bg-vaultic-surface/70 p-8 shadow-xl shadow-black/20">
        <div className="h-full flex items-center justify-center text-vaultic-muted/40">Syncing your financial pulse…</div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-[3rem] border border-vaultic-border bg-vaultic-black/70 p-8 shadow-2xl shadow-black/30">
      <div className="flex items-center justify-between gap-4 border-b border-vaultic-border pb-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-vaultic-muted">Wealth health</p>
          <p className="mt-4 text-5xl font-black tracking-tight text-vaultic-cream">{data?.overall_health_score || '82'}</p>
        </div>
        <span className="rounded-full bg-vaultic-mint/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-vaultic-mint">
          Optimal
        </span>
      </div>

      <div className="mt-8 space-y-6">
        <div className="rounded-3xl border border-vaultic-border bg-vaultic-surface/70 p-6">
          <p className="text-[10px] uppercase tracking-[0.35em] text-vaultic-muted">Daily safe budget</p>
          <p className="mt-4 text-3xl font-black text-vaultic-cream">₹{data?.daily_safe_budget || 2500}</p>
        </div>

        <div className="space-y-4">
          {data?.nudges?.map((nudge, index) => (
            <motion.div
              key={`${nudge}-${index}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: index * 0.08 }}
              className="rounded-3xl border border-vaultic-border bg-vaultic-surface/70 p-4 text-sm text-vaultic-slate"
            >
              {nudge}
            </motion.div>
          ))}
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-vaultic-border pt-6 text-[10px] uppercase tracking-[0.35em] text-vaultic-muted">
        <span>{data?.streak_data?.current_streak || 7}-Day streak</span>
        <Link href="/dashboard" className="text-vaultic-orange font-semibold hover:text-vaultic-cream">
          Enter Dashboard
        </Link>
      </div>
    </div>
  );
}
