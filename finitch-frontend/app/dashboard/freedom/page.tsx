"use client";
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrendingUp, Rocket, Calendar, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getAuthToken } from '@/lib/cookies';
import { readStoredWizardData } from '@/lib/finance';

const sliderStyles = `
  input[type="range"]#monthly-boost {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 8px;
    background: linear-gradient(to right, var(--accent-soft), var(--accent-soft-strong));
    border-radius: 8px;
    outline: none;
    border: 1px solid var(--accent-soft);
  }
  
  input[type="range"]#monthly-boost::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--accent);
    cursor: pointer;
    box-shadow: 0 0 12px var(--accent-soft), 0 0 24px rgba(var(--accent-rgb), 0.24);
    border: 2px solid var(--accent);
    transition: all 0.3s ease;
  }
  
  input[type="range"]#monthly-boost::-webkit-slider-thumb:hover {
    width: 24px;
    height: 24px;
    box-shadow: 0 0 20px rgba(var(--accent-rgb), 0.6), 0 0 32px rgba(var(--accent-rgb), 0.32);
  }
  
  input[type="range"]#monthly-boost::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--accent);
    cursor: pointer;
    box-shadow: 0 0 12px var(--accent-soft), 0 0 24px rgba(var(--accent-rgb), 0.24);
    border: 2px solid var(--accent);
    transition: all 0.3s ease;
  }
  
  input[type="range"]#monthly-boost::-moz-range-thumb:hover {
    width: 24px;
    height: 24px;
    box-shadow: 0 0 20px rgba(var(--accent-rgb), 0.6), 0 0 32px rgba(var(--accent-rgb), 0.32);
  }
  
  input[type="range"]#monthly-boost::-moz-range-track {
    background: transparent;
    border: none;
  }
  
  input[type="range"]#monthly-boost::-moz-range-progress {
    background-color: var(--accent-soft);
    border-radius: 8px;
  }
`;

export default function FreedomPathPage() {
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  type FreedomData = {
    exit_date?: string;
    years_remaining?: number;
  };

  type WizardSnapshot = {
    monthly_income?: number | string;
    fixed_expenses?: number | string;
    savings_amount?: number | string;
    expenses?: Array<{ category?: string; amount?: number | string }>;
  };

  type SimulationResult = {
    new_exit_date: string;
    years_saved: number;
    boost: number;
  };

  const [freedomData, setFreedomData] = useState<FreedomData | null>(null);
  const [wizardData, setWizardData] = useState<WizardSnapshot | null>(null);
  const [boostAmount, setBoostAmount] = useState<number>(5000);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const router = useRouter();

  const buildLocalFreedomData = useCallback((): FreedomData => {
    const income = Math.max(0, Number(wizardData?.monthly_income) || 0);
    const fixedExpenses = Math.max(0, Number(wizardData?.fixed_expenses) || 0);
    const savingsAmount = Math.max(0, Number(wizardData?.savings_amount) || 0);
    const discretionarySpend = Array.isArray(wizardData?.expenses)
      ? wizardData.expenses.reduce((sum, item) => sum + Math.max(0, Number(item.amount) || 0), 0)
      : 0;
    const monthlySurplus = Math.max(0, income - fixedExpenses - discretionarySpend - savingsAmount);
    const yearsRemaining = Math.max(2, Math.min(20, Math.round(18 - monthlySurplus / 10000)));
    const exitDate = new Date();
    exitDate.setFullYear(exitDate.getFullYear() + yearsRemaining);

    return {
      exit_date: exitDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
      years_remaining: yearsRemaining,
    };
  }, [wizardData]);

  const freedomVelocity = useMemo(() => {
    const years = Number(freedomData?.years_remaining ?? buildLocalFreedomData().years_remaining ?? 8);
    return years > 0 ? Math.max(16, Math.min(96, Math.round(100 - (years - 1) * 6))) : 16;
  }, [freedomData, buildLocalFreedomData]);

  const yearlyMomentum = useMemo(() => {
    const years = Number(freedomData?.years_remaining ?? buildLocalFreedomData().years_remaining ?? 8);
    const ratio = Math.max(0.6, Math.min(4, 4 - years / 6));
    return `${ratio.toFixed(1)}x`;
  }, [freedomData, buildLocalFreedomData]);

  const fetchFreedomMetrics = useCallback(async (): Promise<void> => {
    try {
      const token = getAuthToken();
      if (!token) {
        setFreedomData(buildLocalFreedomData());
        return;
      }

      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8001'; 
      const response = await fetch(`${apiBase}/dashboard/summary`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401) {
        router.replace('/login');
        return;
      }

      const result = await response.json();
      if (response.ok && result?.freedom_data) {
        setFreedomData(result.freedom_data);
      } else {
        setFreedomData(buildLocalFreedomData());
      }
    } catch (err) {
      console.error("Failed to compile trajectory data stream.", err);
      setFreedomData(buildLocalFreedomData());
    } finally {
      setLoading(false);
    }
  }, [buildLocalFreedomData, router]);

  const runTrajectorySimulation = async () => {
    setSimulating(true);
    try {
      const token = getAuthToken();
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8001';
      const response = await fetch(`${apiBase}/simulate/trajectory`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ boost_amount: boostAmount })
      });

      if (response.ok) {
        const result = await response.json();
        setSimulationResult(result);
      } else {
        const monthsSaved = Math.max(2, Math.min(18, Math.round(boostAmount / 12000)));
        setSimulationResult({
          new_exit_date: `${monthsSaved} months sooner`,
          years_saved: Math.max(0.3, Math.min(4, monthsSaved / 12)),
          boost: boostAmount,
        });
      }
    } catch (err) {
      console.error("Trajectory simulator failure.", err);
      const monthsSaved = Math.max(2, Math.min(18, Math.round(boostAmount / 12000)));
      setSimulationResult({
        new_exit_date: `${monthsSaved} months sooner`,
        years_saved: Math.max(0.3, Math.min(4, monthsSaved / 12)),
        boost: boostAmount,
      });
    } finally {
      setSimulating(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const readLocalState = () => {
      try {
        const storedWizard = readStoredWizardData();
        if (storedWizard) {
          setWizardData(storedWizard);
        }
      } catch {
        setWizardData(null);
      }
    };

    readLocalState();
    window.addEventListener('vaulticDnaInputsUpdated', readLocalState);
    return () => window.removeEventListener('vaulticDnaInputsUpdated', readLocalState);
  }, []);

  useEffect(() => {
    void fetchFreedomMetrics();
  }, [fetchFreedomMetrics]);

  const freedomTrend = useMemo(() => {
    const years = freedomData?.years_remaining ?? 8;
    return Array.from({ length: 6 }, (_, index) => ({
      month: `T-${5 - index}`,
      years: Math.max(0, Number((years - (years / 5) * index).toFixed(1)))
    }));
  }, [freedomData]);

  const momentumData = useMemo(() => {
    return freedomTrend.map((point) => ({
      month: point.month,
      momentum: Math.max(20, Math.min(100, Math.round(100 - point.years * 10)))
    }));
  }, [freedomTrend]);

  if (loading) return (
    <div className="min-h-screen bg-vaultic-black flex flex-col items-center justify-center gap-4">
      <RefreshCw className="animate-spin text-vaultic-mint" size={32} />
      <p className="text-vaultic-mint font-mono text-[9px] uppercase tracking-[0.3em]">Mapping Freedom Curves...</p>
    </div>
  );

  return (
    <div className="vaultic-page min-w-0 p-4 sm:p-6 md:p-8 lg:p-12 font-sans">
      <style>{sliderStyles}</style>
      {/* HEADER SECTION */}
      <header className="mb-10 lg:mb-14">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-vaultic-mint/10 border border-vaultic-mint/20 rounded-lg flex items-center justify-center text-vaultic-mint">
              <TrendingUp size={16} />
            </div>
            <span className="text-[10px] font-mono tracking-[0.2em] text-vaultic-mint uppercase">Predictive Forecasting</span>
          </div>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight uppercase italic text-vaultic-cream">Freedom Path</h1>
        <p className="text-vaultic-muted text-sm mt-2 italic">Simulate alternative timelines and accelerate your baseline exit targets.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 max-w-7xl min-w-0">
        {/* CURRENT STATUS VIEW PANEL */}
        <div className="vaultic-panel lg:col-span-5 min-w-0 p-6 sm:p-8 lg:p-10 rounded-3xl flex flex-col justify-between overflow-hidden">
          <div>
            <span className="text-[9px] font-mono tracking-widest text-vaultic-muted uppercase block mb-6">Current Calibration</span>
            <h3 className="text-sm font-bold text-vaultic-muted tracking-wide uppercase">Calculated Exit Gate</h3>
            <h2 className="text-4xl sm:text-5xl xl:text-6xl font-black italic tracking-tight text-vaultic-cream mt-2 mb-4 break-words">
              {freedomData?.exit_date || "CALIBRATING"}
            </h2>
            <p className="text-xs font-light leading-relaxed text-vaultic-muted italic">
              Based on your fixed overhead assets and investment ratios, your capital system achieves self-sustaining autonomy in <span className="text-vaultic-mint font-bold">{freedomData?.years_remaining || 0} years</span>.
            </p>
          </div>

          <div className="mt-12 pt-6 border-t border-vaultic-border grid grid-cols-2 gap-4 text-[10px] uppercase font-mono tracking-wider text-vaultic-muted">
            <div className="bg-vaultic-black/60 p-4 rounded-2xl border border-vaultic-border">
              <p className="text-[8px] uppercase tracking-[0.35em] text-vaultic-slate">Velocity Index</p>
              <p className="text-2xl font-black text-vaultic-mint mt-2 break-words">{freedomVelocity}%</p>
            </div>
            <div className="bg-vaultic-black/60 p-4 rounded-2xl border border-vaultic-border">
              <p className="text-[8px] uppercase tracking-[0.35em] text-vaultic-slate">Yearly Momentum</p>
              <p className="text-2xl font-black text-vaultic-cream mt-2 break-words">{yearlyMomentum}</p>
            </div>
          </div>
          <div className="space-y-4 bg-vaultic-black/40 border border-vaultic-border p-5 sm:p-6 rounded-2xl">
            <div className="flex justify-between items-baseline">
              <label
                htmlFor="monthly-boost"
                className="text-[10px] font-bold uppercase tracking-wider text-vaultic-muted"
              >
                Monthly Boost Amount
              </label>
              <span className="text-xl font-black text-vaultic-orange">₹{boostAmount.toLocaleString('en-IN')}</span>
            </div>
            <input
              id="monthly-boost"
              type="range" min="1000" max="50000" step="1000"
              className="w-full"
              value={boostAmount}
              onChange={(e) => setBoostAmount(Number(e.target.value))}
            />
            <div className="flex justify-between text-[9px] font-mono text-vaultic-slate">
              <span>₹1,000</span>
              <span>₹50000</span>
            </div>
          </div>

          <div className="bg-vaultic-black/50 border border-vaultic-border p-5 sm:p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-vaultic-muted font-black">Freedom Curve</p>
                <p className="text-xs text-vaultic-slate mt-1">Projected exit trajectory over time.</p>
              </div>
              <span className="text-[10px] text-vaultic-mint font-black">{freedomTrend[0]?.years || 0}y</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={freedomTrend} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                    <linearGradient id="freedomGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.12} />
                      </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} width={28} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--accent-soft)', color: 'var(--foreground)' }} cursor={{ stroke: 'var(--accent)', strokeDasharray: '3 3' }} />
                  <Line type="monotone" dataKey="years" stroke="var(--accent)" strokeWidth={3} dot={{ r: 2, fill: 'var(--foreground)' }} activeDot={{ r: 4, fill: 'var(--accent)' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <button 
            onClick={runTrajectorySimulation}
            disabled={simulating}
            className="vaultic-btn-primary w-full py-4 rounded-2xl text-[10px] uppercase tracking-widest group disabled:opacity-50"
          >
            {simulating ? <RefreshCw className="animate-spin" size={14} /> : (
              <>
                Warp Trajectory Timeline
                <Rocket size={14} className="group-hover:translate-y-[-2px] group-hover:translate-x-[2px] transition-transform" />
              </>
            )}
          </button>

          {/* RESULTS DISPLAY CONTAINER */}
          {simulationResult && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="p-6 bg-vaultic-orange/5 border border-vaultic-orange/10 rounded-2xl space-y-4"
            >
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-mono tracking-widest text-vaultic-orange uppercase">Warp Execution Result</span>
                <span className="bg-vaultic-orange/10 text-vaultic-orange border border-vaultic-orange/20 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                  Timeline Altered
                </span>
              </div>
              <p className="text-xs font-light text-vaultic-slate leading-relaxed italic">
                Deploying an additional monthly boost of <span className="text-vaultic-cream font-bold">₹{simulationResult.boost.toLocaleString('en-IN')}</span> pulls your target financial independence gate forward to <span className="text-vaultic-orange font-bold underline decoration-2">{simulationResult.new_exit_date}</span>.
              </p>
            </motion.div>
          )}
        </div>

        <div className="lg:col-span-7 min-w-0 space-y-6">
          <div className="vaultic-panel min-w-0 rounded-3xl p-6 sm:p-8 lg:p-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-vaultic-blue font-black">Trajectory Lab</p>
                <h2 className="mt-3 text-3xl sm:text-4xl font-black uppercase italic tracking-tight">Boost impact preview</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-vaultic-muted">
                  Use the monthly boost control to test how additional investing changes your freedom timeline.
                </p>
              </div>
              <div className="rounded-2xl border border-vaultic-border bg-vaultic-black/60 p-4 text-left sm:text-right">
                <p className="text-[9px] uppercase tracking-[0.28em] text-vaultic-muted">Selected Boost</p>
                <p className="mt-2 text-3xl font-black text-vaultic-orange">₹{boostAmount.toLocaleString('en-IN')}</p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-vaultic-border bg-vaultic-black/60 p-5">
                <Calendar className="text-vaultic-blue" size={20} />
                <p className="mt-4 text-[9px] uppercase tracking-[0.28em] text-vaultic-muted">Current Exit</p>
                <p className="mt-2 text-xl font-black text-vaultic-cream">{freedomData?.exit_date || "Calibrating"}</p>
              </div>
              <div className="rounded-2xl border border-vaultic-border bg-vaultic-black/60 p-5">
                <TrendingUp className="text-vaultic-mint" size={20} />
                <p className="mt-4 text-[9px] uppercase tracking-[0.28em] text-vaultic-muted">Velocity</p>
                <p className="mt-2 text-xl font-black text-vaultic-mint">{freedomVelocity}%</p>
              </div>
              <div className="rounded-2xl border border-vaultic-border bg-vaultic-black/60 p-5">
                <Rocket className="text-vaultic-orange" size={20} />
                <p className="mt-4 text-[9px] uppercase tracking-[0.28em] text-vaultic-muted">New Gate</p>
                <p className="mt-2 text-xl font-black text-vaultic-cream">{simulationResult?.new_exit_date || "Run simulation"}</p>
              </div>
            </div>
          </div>

          <div className="vaultic-panel rounded-3xl p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-vaultic-muted font-black">Momentum Graph</p>
                <h3 className="mt-2 text-2xl font-black text-vaultic-cream">Freedom velocity trend</h3>
              </div>
              <span className="text-[10px] uppercase tracking-[0.3em] text-vaultic-mint">Higher is better</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={momentumData} margin={{ top: 10, right: 0, left: -8, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 10 }} width={28} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--accent-soft)' }} />
                  <Bar dataKey="momentum" radius={[10, 10, 0, 0]}>
                    {momentumData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.momentum >= 70 ? 'var(--accent)' : 'var(--accent-soft)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="vaultic-panel rounded-3xl p-6 sm:p-8">
            <p className="text-[10px] uppercase tracking-[0.3em] text-vaultic-muted font-black">Timeline Result</p>
            <div className="mt-5 min-h-32 rounded-2xl border border-vaultic-border bg-vaultic-black/55 p-6">
              {simulationResult ? (
                <p className="text-sm leading-7 text-vaultic-muted">
                  Adding <span className="font-black text-vaultic-orange">₹{simulationResult.boost.toLocaleString('en-IN')}</span> monthly redirects the target to <span className="font-black text-vaultic-cream">{simulationResult.new_exit_date}</span>. Treat this as a planning estimate, then tune the boost until the timeline feels realistic.
                </p>
              ) : (
                <p className="text-sm leading-7 text-vaultic-muted">
                  No simulation has run yet. Adjust the boost amount and execute the trajectory test to see the projected date.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
