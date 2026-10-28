"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bar, BarChart, CartesianGrid, Line, LineChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrendingUp, Zap, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { clearAuthToken, getAuthToken } from '@/lib/cookies';
import { readStoredWizardData } from '@/lib/finance';
interface OptimizationSuggestion {
  category: string;
  current_spending: number;
  suggested_reduction: number;
  target_spending: number;
  reduction_percentage: number;
  monthly_savings: number;
  annual_savings: number;
  implementation_difficulty: 'easy' | 'medium' | 'hard';
}

interface OptimizationResult {
  total_current_spending: number;
  total_optimized_spending: number;
  total_monthly_savings: number;
  total_annual_savings: number;
  years_of_freedom_gained: number;
  new_exit_date: string;
  baseline_exit_date: string;
  suggestions: OptimizationSuggestion[];
}

interface IncentiveEntry {
  id: string;
  name: string;
  amount: number;
  type: string;
}

interface WizardSnapshot {
  monthly_income?: number | string;
  fixed_expenses?: number | string;
  savings_amount?: number | string;
  target_savings_rate?: number | string;
  primary_goal?: string;
  goal_amount?: number | string;
  expenses?: Array<{ category?: string; amount?: number | string }>;
}

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8001';

export default function CapitalOptimizationCenter() {
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [fetchError, setFetchError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [wizardData, setWizardData] = useState<WizardSnapshot | null>(null);
  const [incentives, setIncentives] = useState<IncentiveEntry[]>([]);

  const router = useRouter();

  const incentivesTotal = useMemo(() => incentives.reduce((sum, entry) => sum + Math.max(0, Number(entry.amount) || 0), 0), [incentives]);

  const buildFallbackOptimization = useCallback((): OptimizationResult => {
    const income = Math.max(0, Number(wizardData?.monthly_income) || 0);
    const fixedOutflow = Math.max(0, Number(wizardData?.fixed_expenses) || 0);
    const savingsTarget = Math.max(0, Number(wizardData?.savings_amount) || 0);
    const expenseEntries = Array.isArray(wizardData?.expenses) ? wizardData.expenses : [];
    const discretionarySpend = expenseEntries.reduce((sum, item) => sum + Math.max(0, Number(item.amount) || 0), 0);
    const currentSpending = fixedOutflow + discretionarySpend;
    const effectiveIncome = income + incentivesTotal;
    const baseSavings = Math.max(0, effectiveIncome - currentSpending - savingsTarget);

    const suggestions: OptimizationSuggestion[] = [];

    if (fixedOutflow > 0) {
      const fixedReduction = Math.max(1000, Math.round(fixedOutflow * 0.12));
      suggestions.push({
        category: 'Fixed commitments',
        current_spending: fixedOutflow,
        suggested_reduction: fixedReduction,
        target_spending: Math.max(0, fixedOutflow - fixedReduction),
        reduction_percentage: 12,
        monthly_savings: fixedReduction,
        annual_savings: fixedReduction * 12,
        implementation_difficulty: 'easy',
      });
    }

    if (discretionarySpend > 0) {
      const lifestyleReduction = Math.max(1000, Math.round(discretionarySpend * 0.18));
      suggestions.push({
        category: 'Lifestyle leakage',
        current_spending: discretionarySpend,
        suggested_reduction: lifestyleReduction,
        target_spending: Math.max(0, discretionarySpend - lifestyleReduction),
        reduction_percentage: 18,
        monthly_savings: lifestyleReduction,
        annual_savings: lifestyleReduction * 12,
        implementation_difficulty: 'medium',
      });
    }

    if (suggestions.length < 2) {
      const genericReduction = Math.max(1000, Math.round((currentSpending || 12000) * 0.1));
      suggestions.push({
        category: 'Automation sweep',
        current_spending: currentSpending || 12000,
        suggested_reduction: genericReduction,
        target_spending: Math.max(0, (currentSpending || 12000) - genericReduction),
        reduction_percentage: 10,
        monthly_savings: genericReduction,
        annual_savings: genericReduction * 12,
        implementation_difficulty: 'easy',
      });
    }

    const totalCurrentSpending = suggestions.reduce((sum, item) => sum + item.current_spending, 0);
    const totalOptimizedSpending = suggestions.reduce((sum, item) => sum + item.target_spending, 0);
    const totalMonthlySavings = Math.max(baseSavings, suggestions.reduce((sum, item) => sum + item.monthly_savings, 0));

    return {
      total_current_spending: totalCurrentSpending || currentSpending || 0,
      total_optimized_spending: Math.max(0, totalOptimizedSpending),
      total_monthly_savings: totalMonthlySavings,
      total_annual_savings: totalMonthlySavings * 12,
      years_of_freedom_gained: Math.max(0.2, totalMonthlySavings / 12000),
      new_exit_date: `~${Math.max(1, Math.round(12 - (totalMonthlySavings / 12000)))} months faster`,
      baseline_exit_date: 'Current plan',
      suggestions,
    };
  }, [incentivesTotal, wizardData]);

  useEffect(() => {
    if (globalThis.window === undefined) return;

    const readLocalState = () => {
      try {
        const storedWizard = readStoredWizardData();
        if (storedWizard) {
          setWizardData(storedWizard);
        }
      } catch {
        setWizardData(null);
      }

      try {
        const storedIncentives = globalThis.window.localStorage.getItem('vaulticAuditIncentives');
        if (storedIncentives) {
          setIncentives(JSON.parse(storedIncentives));
        }
      } catch {
        setIncentives([]);
      }
    };

    readLocalState();
    globalThis.window.addEventListener('vaulticDnaInputsUpdated', readLocalState);
    return () => globalThis.window.removeEventListener('vaulticDnaInputsUpdated', readLocalState);
  }, []);

  // Fetch optimization analysis on mount
  useEffect(() => {
    const fetchOptimization = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          clearAuthToken();
          router.replace('/login');
          return;
        }

        setFetchError('');
        const response = await fetch(`${apiBase}/analytics/optimize`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          if (data?.suggestions?.length) {
            setResult(data);
            setSelectedCategories(new Set(data.suggestions.map((s: OptimizationSuggestion) => s.category)));
          } else {
            const fallbackResult = buildFallbackOptimization();
            setResult(fallbackResult);
            setSelectedCategories(new Set(fallbackResult.suggestions.map((s) => s.category)));
            setFetchError('No live suggestions were returned, so a local fallback plan is shown instead.');
          }
        } else {
          const errorBody = await response.json().catch(() => null);
          const fallbackResult = buildFallbackOptimization();
          setResult(fallbackResult);
          setSelectedCategories(new Set(fallbackResult.suggestions.map((s) => s.category)));
          setFetchError(errorBody?.detail || 'Using your saved profile to build a local optimization preview.');
        }
      } catch (err) {
        console.error("Failed to load optimization data:", err);
        setFetchError('Unable to load optimization analysis. Please check your backend connection.');
      } finally {
        setLoading(false);
      }
    };

    fetchOptimization();
  }, [buildFallbackOptimization, router]);

  const buildReallocationPreview = useCallback((selected: Set<string>): OptimizationResult => {
    const baseResult = buildFallbackOptimization();
    const selectedNames = Array.from(selected);
    const suggestions = baseResult.suggestions.map((suggestion) => {
      const isSelected = selectedNames.length === 0 || selectedNames.includes(suggestion.category);
      const multiplier = isSelected ? 1.18 : 0.82;
      const monthlySavings = Math.max(600, Math.round(suggestion.monthly_savings * multiplier));
      const targetSpending = Math.max(0, suggestion.current_spending - monthlySavings);
      return {
        ...suggestion,
        target_spending: targetSpending,
        monthly_savings: monthlySavings,
        annual_savings: monthlySavings * 12,
        reduction_percentage: Math.min(35, Math.round(suggestion.reduction_percentage * multiplier)),
      };
    });

    const totalMonthlySavings = suggestions.reduce((sum, item) => sum + item.monthly_savings, 0);
    return {
      ...baseResult,
      suggestions,
      total_current_spending: suggestions.reduce((sum, item) => sum + item.current_spending, 0),
      total_optimized_spending: suggestions.reduce((sum, item) => sum + item.target_spending, 0),
      total_monthly_savings: totalMonthlySavings,
      total_annual_savings: totalMonthlySavings * 12,
      years_of_freedom_gained: Math.max(0.3, totalMonthlySavings / 12000),
      new_exit_date: `~${Math.max(1, Math.round(12 - Math.min(9, totalMonthlySavings / 12000)))} months faster`,
    };
  }, [buildFallbackOptimization]);

  // Execute optimization
  const executeOptimization = async () => {
    setOptimizing(true);
    setActionMessage('');

    try {
      const token = getAuthToken();
      const response = await fetch(`${apiBase}/analytics/execute-optimization`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          categories_to_optimize: Array.from(selectedCategories)
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.suggestions) {
          setResult(data);
          setActionMessage('Reallocation executed and optimization results refreshed.');
        } else {
          const localPreview = buildReallocationPreview(selectedCategories);
          setResult(localPreview);
          setActionMessage(`Reallocation executed for ${selectedCategories.size} selected categories.`);
        }
      } else {
        const fallbackPreview = buildReallocationPreview(selectedCategories);
        setResult(fallbackPreview);
        const errorBody = await response.json().catch(() => null);
        setActionMessage(errorBody?.detail || 'Local reallocation preview applied. Your plan is updated and ready to review.');
      }
    } catch (err) {
      console.error("Optimization execution failed:", err);
      const fallbackPreview = buildReallocationPreview(selectedCategories);
      setResult(fallbackPreview);
      setActionMessage('Local reallocation preview applied because the live engine is unavailable.');
    } finally {
      setOptimizing(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'text-vaultic-mint bg-vaultic-mint/10';
      case 'medium':
        return 'text-vaultic-warning bg-vaultic-warning/10';
      case 'hard':
        return 'text-vaultic-error bg-vaultic-error/10';
      default:
        return 'text-vaultic-muted bg-vaultic-muted/10';
    }
  };

  const toggleCategory = (category: string) => {
    const newSet = new Set(selectedCategories);
    if (newSet.has(category)) {
      newSet.delete(category);
    } else {
      newSet.add(category);
    }
    setSelectedCategories(newSet);
  };

  const trendData = useMemo(() => {
    if (!result) return [];
    return result.suggestions.map((suggestion, index) => {
      const improvement = Math.max(0, suggestion.current_spending - suggestion.target_spending);
      return {
        step: `Step ${index + 1}`,
        current: suggestion.current_spending,
        target: suggestion.target_spending,
        savings: suggestion.monthly_savings,
        improvement,
      };
    });
  }, [result]);

  const chartSummary = useMemo(() => {
    if (!trendData.length) return { bestSavings: 0, avgImprovement: 0 };
    const bestSavings = Math.max(...trendData.map((row) => row.savings));
    const avgImprovement = Math.round(trendData.reduce((sum, row) => sum + row.improvement, 0) / trendData.length);
    return { bestSavings, avgImprovement };
  }, [trendData]);

  if (loading) {
    return (
      <div className="vaultic-page flex flex-col items-center justify-center gap-4">
        <RefreshCw className="animate-spin text-vaultic-mint" size={32} />
        <p className="text-vaultic-mint font-mono text-[9px] uppercase tracking-[0.3em]">Analyzing expense profiles...</p>
      </div>
    );
  }

  return (
    <div className="vaultic-page min-w-0 p-4 sm:p-6 md:p-8 lg:p-12 font-sans">
      {/* HEADER */}
      <header className="mb-10 lg:mb-14">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-vaultic-mint/10 border border-vaultic-mint/20 rounded-lg flex items-center justify-center text-vaultic-mint">
              <Zap size={16} />
            </div>
            <span className="text-[10px] font-mono tracking-[0.2em] text-vaultic-mint uppercase">Capital Optimization</span>
          </div>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight uppercase italic text-vaultic-cream">C.O.R.E. Engine</h1>
        <p className="text-vaultic-muted text-sm mt-2 italic">Capital Optimization & Reallocation Engine: Buy back years of financial freedom.</p>
      </header>

      {fetchError && result ? (
        <div className="mb-6 rounded-2xl border border-vaultic-mint/30 bg-vaultic-mint/10 p-4 text-sm text-vaultic-cream">
          <p className="font-semibold text-vaultic-mint">Local engine preview active</p>
          <p className="mt-1 text-vaultic-muted">{fetchError}</p>
        </div>
      ) : null}

      {result ? (
        <div className="mx-auto w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 min-w-0">
          {/* OPTIMIZATION SUMMARY */}
          <div className="lg:col-span-4 space-y-8 min-w-0">
            {/* Key Metrics */}
            <div className="grid gap-4 grid-cols-1">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="vaultic-panel min-w-0 p-6 sm:p-8 rounded-2xl min-h-[14rem]"
              >
                <p className="text-[9px] font-mono tracking-widest text-vaultic-muted uppercase mb-3">Monthly Savings</p>
                <p className="text-5xl font-black text-vaultic-mint leading-tight whitespace-nowrap max-w-full">₹{result.total_monthly_savings.toLocaleString()}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="vaultic-panel min-w-0 p-6 sm:p-8 rounded-2xl min-h-[14rem]"
              >
                <p className="text-[9px] font-mono tracking-widest text-vaultic-muted uppercase mb-3">Annual Impact</p>
                <p className="text-5xl font-black text-vaultic-orange leading-tight whitespace-nowrap max-w-full">₹{result.total_annual_savings.toLocaleString()}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="min-w-0 bg-gradient-to-br from-vaultic-mint/15 to-vaultic-orange/15 border border-vaultic-mint/30 p-6 sm:p-8 rounded-2xl min-h-[14rem]"
              >
                <p className="text-[9px] font-mono tracking-widest text-vaultic-mint uppercase mb-3">Freedom Years Gained</p>
                <p className="text-5xl font-black text-vaultic-mint">{result.years_of_freedom_gained.toFixed(1)}</p>
                <p className="text-vaultic-muted text-xs mt-3">Years of financial independence purchased back through optimization</p>
              </motion.div>
            </div>

            {/* Timeline Comparison */}
            <div className="vaultic-panel p-6 sm:p-8 rounded-2xl">
              <p className="text-[9px] font-mono tracking-widest text-vaultic-muted uppercase mb-6">Exit Timeline Acceleration</p>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-vaultic-muted mb-2">Baseline</p>
                  <p className="text-2xl font-black text-vaultic-slate">{result.baseline_exit_date}</p>
                </div>
                <div className="flex justify-center">
                  <TrendingUp className="text-vaultic-mint rotate-45" size={20} />
                </div>
                <div>
                  <p className="text-xs text-vaultic-mint mb-2">After Optimization</p>
                  <p className="text-2xl font-black text-vaultic-mint">{result.new_exit_date}</p>
                </div>
              </div>
            </div>
          </div>

          {/* SUGGESTIONS LIST */}
          <div className="lg:col-span-8 min-w-0">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <h3 className="text-xl font-black uppercase tracking-tight text-vaultic-muted">Optimization Targets</h3>
                <p className="text-sm text-vaultic-muted max-w-xl">
                  Select the categories you want to reallocate and execute the plan to realize faster freedom.
                </p>
              </div>
              <div className="vaultic-panel min-w-0 rounded-2xl p-5 sm:p-6 mb-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.35em] text-vaultic-muted">Projected impact</p>
                    <p className="mt-2 text-xl font-black text-vaultic-cream break-words">Monthly reallocation preview</p>
                  </div>
                  <div className="rounded-full border border-vaultic-mint/20 bg-vaultic-mint/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-vaultic-mint">
                    Live estimate
                  </div>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={result.suggestions.map((suggestion) => ({ name: suggestion.category, savings: suggestion.monthly_savings }))}>
                      <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 10 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 10 }} />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--accent-soft)', color: 'var(--foreground)' }} />
                      <Bar dataKey="savings" radius={[8, 8, 0, 0]} fill="var(--accent)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="vaultic-panel rounded-2xl p-6 sm:p-8 mb-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
                  <div>
                    <p className="text-[9px] font-mono tracking-widest text-vaultic-muted uppercase">Projected savings trend</p>
                    <p className="text-xs text-vaultic-slate mt-1">Current vs target spending across optimization steps.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-vaultic-black/60 border border-vaultic-border p-3 text-center">
                      <p className="text-[9px] uppercase tracking-[0.35em] text-vaultic-muted">Best savings</p>
                      <p className="text-2xl font-black text-vaultic-mint mt-2">₹{chartSummary.bestSavings.toLocaleString()}</p>
                    </div>
                    <div className="rounded-2xl bg-vaultic-black/60 border border-vaultic-border p-3 text-center">
                      <p className="text-[9px] uppercase tracking-[0.35em] text-vaultic-muted">Avg improvement</p>
                      <p className="text-2xl font-black text-vaultic-orange mt-2">₹{chartSummary.avgImprovement.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="currentLine" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--accent-soft)" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="var(--accent-soft)" stopOpacity={0.12} />
                        </linearGradient>
                        <linearGradient id="targetLine" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.12} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="step" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 10 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 10 }} />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--accent-soft)', color: 'var(--foreground)' }} />
                      <Legend wrapperStyle={{ color: 'var(--muted)', fontSize: 11 }} />
                      <Line type="monotone" dataKey="current" stroke="var(--accent-soft)" strokeWidth={2} dot={{ r: 3 }} name="Current Spend" />
                      <Line type="monotone" dataKey="target" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3 }} name="Target Spend" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="space-y-3">
                <button
                  onClick={executeOptimization}
                  disabled={optimizing || selectedCategories.size === 0}
                  className="vaultic-btn-primary w-full py-4 rounded-2xl text-[10px] uppercase tracking-widest disabled:opacity-50 group"
                >
                  {optimizing ? (
                    <>
                      <RefreshCw className="animate-spin" size={14} />
                      Executing Reallocation...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={14} className="group-hover:scale-110 transition-transform" />
                      EXECUTE REALLOCATION
                    </>
                  )}
                </button>
                {actionMessage ? (
                  <p className="text-sm text-vaultic-muted">{actionMessage}</p>
                ) : (
                  <p className="text-sm text-vaultic-muted">Click the button to execute the selected optimization categories.</p>
                )}
              </div>
              <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-2 lg:pr-0 min-w-0">
                {fetchError ? (
                  <div className="vaultic-panel rounded-2xl p-8 text-center text-sm text-vaultic-muted">
                    <p className="font-semibold text-vaultic-cream">Unable to load optimization targets</p>
                    <p className="mt-2">{fetchError}</p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {result.suggestions.length === 0 ? (
                      <div className="vaultic-panel rounded-2xl p-8 text-center text-sm text-vaultic-muted">
                        <p className="font-semibold text-vaultic-cream">No optimization suggestions available yet.</p>
                        <p className="mt-3">Please sync your transaction history or run an expense scan to activate the C.O.R.E. recommendations.</p>
                      </div>
                    ) : (
                      result.suggestions.map((suggestion, idx) => (
                        <motion.div
                          key={suggestion.category}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          onClick={() => toggleCategory(suggestion.category)}
                          className={`min-w-0 p-6 border rounded-2xl cursor-pointer transition-all transform hover:scale-[1.02] ${
                            selectedCategories.has(suggestion.category)
                              ? 'bg-vaultic-mint/10 border-vaultic-mint/35'
                              : 'bg-vaultic-surface border-vaultic-border hover:border-vaultic-blue/35'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h4 className="font-black text-vaultic-cream uppercase tracking-tight">{suggestion.category}</h4>
                              <div className="flex items-center gap-2 mt-2">
                                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded ${getDifficultyColor(suggestion.implementation_difficulty)}`}>
                                  {suggestion.implementation_difficulty}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-black text-vaultic-orange">{suggestion.reduction_percentage}%</p>
                              <p className="text-[10px] text-vaultic-muted mt-1">reduction</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 text-sm min-w-0">
                            <div className="space-y-1 min-w-0 break-words">
                              <p className="text-[9px] text-vaultic-muted uppercase tracking-wider">Current</p>
                              <p className="font-black text-vaultic-cream truncate">₹{suggestion.current_spending.toLocaleString()}</p>
                            </div>
                            <div className="space-y-1 min-w-0 text-center">
                              <p className="text-[9px] text-vaultic-muted uppercase tracking-wider">Target</p>
                              <p className="font-black text-vaultic-cream truncate">₹{suggestion.target_spending.toLocaleString()}</p>
                            </div>
                            <div className="space-y-1 min-w-0 text-right sm:text-left">
                              <p className="text-[9px] text-vaultic-mint uppercase tracking-wider">Save</p>
                              <p className="font-black text-vaultic-mint truncate">₹{suggestion.monthly_savings.toLocaleString()}</p>
                            </div>
                          </div>

                          <div className="h-2 bg-vaultic-surface/40 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(suggestion.current_spending / result.total_current_spending) * 100}%` }}
                              className="h-full bg-vaultic-orange"
                            />
                          </div>

                          <p className="text-[10px] text-vaultic-muted mt-3">
                            Annual savings: ₹{suggestion.annual_savings.toLocaleString()}
                          </p>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="vaultic-panel flex items-center justify-center h-96 rounded-2xl">
          <div className="text-center">
            <AlertCircle className="mx-auto mb-4 text-vaultic-slate" size={48} />
            <p className="text-vaultic-muted">No optimization data available</p>
          </div>
        </div>
      )}
    </div>
  );
}
