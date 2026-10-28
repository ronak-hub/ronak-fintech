"use client";

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
const DashboardComposedChart = dynamic(() => import('@/components/Charts/DashboardComposedChart'), { ssr: false });
const BarSavingsChart = dynamic(() => import('@/components/graphs/BarSavingsChart'), { ssr: false });
const PieGoalChart = dynamic(() => import('@/components/graphs/PieGoalChart'), { ssr: false });
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { getEffectiveSavingsAmount, readStoredWizardData } from '@/lib/finance';

const fallbackData = [
  { name: 'Jan', income: 120000, expenses: 76000, savings: 22000 },
  { name: 'Feb', income: 130000, expenses: 82000, savings: 25000 },
  { name: 'Mar', income: 128000, expenses: 79000, savings: 24000 },
  { name: 'Apr', income: 138000, expenses: 85000, savings: 28000 },
  { name: 'May', income: 145000, expenses: 90000, savings: 30000 },
];

const COLORS = ['#F59E0B', '#22C55E', '#38BDF8', '#A78BFA', '#F97316'];

type DnaExpense = { id: string; category: string; amount: string | number };

type DnaData = {
  monthly_income?: number | string;
  fixed_expenses?: number | string;
  savings_amount?: number | string;
  target_savings_rate?: number | string;
  expenses?: DnaExpense[];
};

const formatCurrency = (value: number | string) => {
  const amount = Number(value) || 0;
  if (Math.abs(amount) >= 1_000_000) return `₹${(amount / 1_000_000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1_000) return `₹${Math.round(amount / 1000)}k`;
  return `₹${amount}`;
};

export default function DashboardGraphs() {
  const [dnaData, setDnaData] = useState<DnaData | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isWizardPreview = searchParams?.get('wizardStep') === '2';

  useEffect(() => {
    if (globalThis.window === undefined) return;

    const readStored = () => {
      const stored = readStoredWizardData();
      if (!stored) return;
      try {
        const parsed = stored as DnaData;
        setTimeout(() => setDnaData(parsed), 0);
      } catch {
        setTimeout(() => setDnaData(null), 0);
      }
    };

    // initial read
    readStored();

    // listen for custom update events so this page can refresh without a full reload
    const handler = () => readStored();
    globalThis.window.addEventListener('vaulticDnaInputsUpdated', handler);
    return () => {
      globalThis.window.removeEventListener('vaulticDnaInputsUpdated', handler);
    };
  }, []);

  const expenseBreakdown = useMemo(() => {
    if (!dnaData?.expenses?.length) return [];
    const tally = dnaData.expenses.reduce((acc: Record<string, number>, item: DnaExpense) => {
      const amount = Number(item.amount) || 0;
      if (!amount) return acc;
      acc[item.category] = (acc[item.category] || 0) + amount;
      return acc;
    }, {});
    return Object.entries(tally).map(([category, amount], idx) => ({ category, amount, fill: COLORS[idx % COLORS.length] }));
  }, [dnaData]);

  const chartData = useMemo(() => {
    if (!dnaData) return fallbackData;
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

  const [liveChartData, setLiveChartData] = useState(chartData);

  useEffect(() => {
    setLiveChartData(chartData);
    if (chartData.length === 0) return undefined;

    const interval = setInterval(() => {
      setLiveChartData(
        chartData.map((point) => ({
          ...point,
          savings: Math.max(0, Math.round(point.savings * (1 + (Math.random() - 0.5) * 0.06))),
        })),
      );
    }, 1750);

    return () => clearInterval(interval);
  }, [chartData]);

  const income = Number(dnaData?.monthly_income) || 0;
  const fixedExpenses = Number(dnaData?.fixed_expenses) || 0;
  const savingsAmount = getEffectiveSavingsAmount(dnaData ?? undefined);
  const safeSpend = Math.max(income - fixedExpenses - savingsAmount, 0);

  return (
    <div className={`min-h-screen ${isWizardPreview ? 'bg-vaultic-ink/95' : 'bg-vaultic-black'} px-4 py-6 text-vaultic-cream overflow-x-hidden`}>
      <div className="mx-auto min-w-0 flex max-w-6xl flex-col gap-6">
        <div className="rounded-[2rem] border border-vaultic-border bg-vaultic-black/75 p-6 shadow-[0_0_60px_rgba(var(--accent-rgb),0.16)]">
          <div className="mb-6 flex flex-col gap-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-col gap-4">
                {isWizardPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      if (globalThis.window === undefined) return;
                      globalThis.window.localStorage.setItem('vaulticDnaStep', '2');
                      router.push('/dashboard?wizardStep=2');
                    }}
                    className="inline-flex w-fit items-center gap-2 rounded-full border border-vaultic-cream/15 bg-vaultic-black/80 px-5 py-3 text-sm font-semibold text-vaultic-cream transition hover:border-vaultic-orange hover:text-vaultic-orange"
                  >
                    <ArrowLeft size={16} /> Back to Step 2
                  </button>
                )}
                <div className="max-w-2xl">
                  <p className="text-xs uppercase tracking-[0.35em] text-vaultic-muted">Graph explorer</p>
                  <h1 className="text-4xl font-black text-vaultic-cream">Your cash flow charts</h1>
                  <p className="mt-3 text-sm leading-6 text-vaultic-slate">
                    These charts explain where your monthly money is coming from, where it goes, and how much you can save. If you are new to finance, start with the three summary cards below before looking at the charts.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-3 lg:items-end">
                {isWizardPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      if (globalThis.window === undefined) return;
                      globalThis.window.localStorage.setItem('vaulticDnaStep', '3');
                      router.push('/dashboard?wizardStep=3');
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-vaultic-orange/40 bg-vaultic-orange/10 px-5 py-3 text-sm font-semibold text-vaultic-orange transition hover:bg-vaultic-orange hover:text-vaultic-ink"
                  >
                    Next Step <ArrowRight size={16} />
                  </button>
                )}
                <div className="rounded-[1.75rem] border border-vaultic-border/60 bg-vaultic-black/80 p-4 text-center">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-vaultic-muted">Savings</p>
                  <p className="mt-3 text-2xl font-black text-vaultic-cyan">₹{savingsAmount.toLocaleString('en-IN')}</p>
                  <p className="mt-2 text-xs text-vaultic-slate">Money you keep for your goals or emergencies.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-vaultic-border/50 bg-vaultic-ink/80 p-5 text-sm text-vaultic-cream">
            <p className="font-semibold text-vaultic-cream">Simple meaning</p>
            <p className="mt-2 text-vaultic-slate">Income should be more than spending; if so, that means you have money left to save. The graphs show this in a way that is easy to compare.</p>
            <p className="mt-2 text-vaultic-slate">Safe spend is what remains after your fixed bills and savings. Right now that is ₹{safeSpend.toLocaleString('en-IN')}.</p>
          </div>
        </div>

        <div className="rounded-[2rem] border border-vaultic-border bg-vaultic-black/75 p-6 shadow-[0_0_60px_rgba(var(--accent-rgb),0.16)]">
          <div className="mb-6 flex flex-col gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-vaultic-muted">Income vs Expenses</p>
              <h2 className="text-3xl font-black text-vaultic-cream">Do you earn more than you spend?</h2>
            </div>
            <p className="max-w-3xl text-sm leading-6 text-vaultic-slate">
              This chart compares your monthly income with your regular spending and savings. If the green income line stays above the orange expenses line, you are in a comfortable position.
            </p>
          </div>
          <section className="rounded-[2rem] border border-vaultic-border bg-vaultic-black/80 p-6">
              <div className="w-full h-[400px]">
                <DashboardComposedChart />
              </div>
          </section>
        </div>

        <div className="rounded-[2rem] border border-vaultic-border bg-vaultic-black/75 p-6 shadow-[0_0_60px_rgba(var(--accent-rgb),0.16)]">
          <div className="mb-6 flex flex-col gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-vaultic-muted">Savings Progress</p>
              <h2 className="text-3xl font-black text-vaultic-cream">How much are you saving each month?</h2>
            </div>
            <p className="max-w-3xl text-sm leading-6 text-vaultic-slate">
              This bar chart shows how much money you are saving each month after paying bills. Taller bars mean more money available for your goals.
            </p>
          </div>
          <section className="rounded-[2rem] border border-vaultic-border bg-vaultic-black/80 p-6">
            <div className="w-full h-[350px]">
              <BarSavingsChart data={chartData} />
            </div>
          </section>
        </div>

        <div className="rounded-[2rem] border border-vaultic-border bg-vaultic-black/75 p-6 shadow-[0_0_60px_rgba(var(--accent-rgb),0.16)]">
          <div className="mb-6 flex flex-col gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-vaultic-muted">Fixed Expenses Breakdown</p>
              <h2 className="text-3xl font-black text-vaultic-cream">Where is your money going?</h2>
            </div>
            <p className="max-w-3xl text-sm leading-6 text-vaultic-slate">
              Each slice represents one category of your fixed monthly spend. The larger the slice, the more money is going there.
            </p>
          </div>
          <section className="rounded-[2rem] border border-vaultic-border bg-vaultic-black/80 p-6">
            <div className="w-full flex justify-center h-[350px]">
              {/** PieGoalChart expects [{ name, value }] */}
              <PieGoalChart
                data={
                  expenseBreakdown.length
                    ? expenseBreakdown.map((e) => ({ name: e.category, value: e.amount }))
                    : [{ name: 'No expenses added', value: 1 }]
                }
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
