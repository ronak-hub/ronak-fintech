"use client";

import Link from 'next/link';
import { ArrowUpRight, Wallet2, Target, ArrowRight } from 'lucide-react';

interface DashboardSummaryCardsProps {
  dailySafeBudget: number;
  healthScore: number;
  nextGoal: string;
}

export default function DashboardSummaryCards({ dailySafeBudget, healthScore, nextGoal }: DashboardSummaryCardsProps) {
  const cards = [
    {
      title: 'Safe spend today',
      value: `₹${dailySafeBudget.toLocaleString('en-IN')}`,
      hint: 'A comfortable amount to spend today',
      icon: Wallet2,
      accent: 'text-vaultic-cyan',
      href: '/dashboard/audit',
    },
    {
      title: 'Money health score',
      value: `${healthScore}/100`,
      hint: 'Your current plan is moving in the right direction',
      icon: ArrowRight,
      accent: 'text-vaultic-mint',
      href: '/dashboard/freedom',
    },
    {
      title: 'Next focus',
      value: nextGoal,
      hint: 'Keep your plan simple and consistent',
      icon: Target,
      accent: 'text-vaultic-orange',
      href: '/dashboard/core',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3 auto-rows-fr min-w-0">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Link key={card.title} href={card.href} className="min-w-0 break-words rounded-[1.5rem] border border-vaultic-border/70 bg-vaultic-surface/80 p-5 shadow-lg shadow-black/10 backdrop-blur h-full flex flex-col justify-between transition-transform hover:-translate-y-1">
            <div className="min-w-0 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-vaultic-muted">{card.title}</p>
                <p className={`mt-3 text-2xl font-black ${card.accent} whitespace-nowrap max-w-full`}>{card.value}</p>
              </div>
              <div className={`rounded-2xl bg-vaultic-black/40 p-2 ${card.accent}`}>
                <Icon size={18} />
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-vaultic-muted">{card.hint}</p>
            <div className="mt-5 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-vaultic-orange">
              View details
              <ArrowUpRight size={14} />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
