"use client";
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface NudgeItem {
  category: string;
  amount: number;
  merchant: string;
  timestamp: string;
}

export default function NudgeFeed() {
  const [liveNudges, setLiveNudges] = useState<NudgeItem[]>([]);

  useEffect(() => {
    const fetchNudges = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8001/api/v1/history');
        if (!response.ok) throw new Error('Failed to fetch');
        const history = await response.json();
        setLiveNudges(history.slice(-3).reverse());
      } catch {
        setLiveNudges([
          { category: 'Food', amount: 450, merchant: 'Zomato', timestamp: 'Today' },
          { category: 'Shopping', amount: 2400, merchant: 'Amazon', timestamp: 'Yesterday' },
          { category: 'Travel', amount: 1200, merchant: 'Uber', timestamp: 'Today' },
        ]);
      }
    };

    fetchNudges();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.35em] text-vaultic-muted">
        <span>Behavioral stream</span>
        <span className="h-2 w-2 rounded-full bg-vaultic-orange animate-pulse" />
      </div>

      {liveNudges.map((nudge) => (
        <motion.div
          key={`${nudge.merchant}-${nudge.amount}-${nudge.timestamp}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-vaultic-border bg-vaultic-surface/70 p-5 text-sm text-vaultic-slate transition hover:border-vaultic-orange/30"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-vaultic-muted">{nudge.merchant}</p>
              <p className="mt-2 text-sm font-semibold text-vaultic-cream">₹{nudge.amount} · {nudge.category}</p>
            </div>
            <span className="text-[10px] uppercase tracking-[0.35em] text-vaultic-orange">-{Math.round(nudge.amount / 150)}d</span>
          </div>
          <p className="mt-3 text-[11px] text-vaultic-muted">{nudge.timestamp}</p>
        </motion.div>
      ))}
    </div>
  );
}
