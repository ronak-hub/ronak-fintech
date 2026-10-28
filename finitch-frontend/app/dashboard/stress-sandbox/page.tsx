"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, AlertTriangle, RefreshCw, Zap, Percent } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { clearAuthToken, getAuthToken } from '@/lib/cookies';

interface StressTestResult {
  scenario_name: string;
  baseline_exit_date: string;
  stressed_exit_date: string;
  months_delayed: number;
  years_of_runway_lost: number;
  survival_probability: number;
  critical_risk: boolean;
  impact_severity: 'low' | 'medium' | 'high' | 'critical';
}

export default function WealthStressSandbox() {
  const [simulating, setSimulating] = useState(false);

  // Stress test parameters
  const [jobLossDuration, setJobLossDuration] = useState(3); // months
  const [emergencyInflation, setEmergencyInflation] = useState(25); // percentage
  const [investmentShock, setInvestmentShock] = useState(-10); // percentage
  const [marketCrashSeverity, setMarketCrashSeverity] = useState(0); // percentage drop

  // Results
  const [result, setResult] = useState<StressTestResult | null>(null);

  const router = useRouter();

  const getTacticalRecommendation = (): string => {
    if (!result) return '';
    if (result.years_of_runway_lost > 5) {
      return 'CRITICAL: Build additional emergency reserves immediately. Consider increasing income or reducing baseline expenses.';
    }
    if (result.years_of_runway_lost > 2) {
      return 'HIGH PRIORITY: Review insurance coverage and establish enhanced emergency fund (12 months of expenses minimum).';
    }
    return 'MODERATE: Maintain current risk posture but monitor emergency fund quarterly.';
  };

  // Fetch baseline data on mount
  useEffect(() => {
    const fetchBaseline = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          clearAuthToken();
          router.replace('/login');
          return;
        }

        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8001';
        const response = await fetch(`${apiBase}/dashboard/summary`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          // Baseline data loaded successfully - can be used for future comparisons
        }
      } catch (err) {
        console.error("Failed to load baseline data:", err);
      }
    };

    fetchBaseline();
  }, [router]);

  // Run stress test simulation
  const runStressTest = async () => {
    setSimulating(true);
    try {
      const token = getAuthToken();

      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8001';
      const response = await fetch(`${apiBase}/simulate/stress-test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          job_loss_months: jobLossDuration,
          emergency_expense_inflation: emergencyInflation,
          investment_return_shock: investmentShock,
          market_crash_severity: marketCrashSeverity
        })
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
      }
    } catch (err) {
      console.error("Stress test failed:", err);
    } finally {
      setSimulating(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'text-vaultic-mint bg-vaultic-mint/10 border border-vaultic-mint/20';
      case 'medium':
        return 'text-vaultic-warning bg-vaultic-warning/10 border border-vaultic-warning/20';
      case 'high':
        return 'text-vaultic-orange bg-vaultic-orange/10 border border-vaultic-orange/20';
      case 'critical':
        return 'text-vaultic-error bg-vaultic-error/10 border border-vaultic-error/20';
      default:
        return 'text-vaultic-muted bg-vaultic-muted/10 border border-vaultic-muted/20';
    }
  };

  return (
    <div className="vaultic-page p-4 sm:p-6 md:p-8 lg:p-12 font-sans">
      {/* HEADER */}
      <header className="mb-10 lg:mb-14">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-vaultic-error/10 border border-vaultic-error/20 rounded-lg flex items-center justify-center text-vaultic-error">
              <AlertTriangle size={16} />
            </div>
            <span className="text-[10px] font-mono tracking-[0.2em] text-vaultic-error uppercase">War-Room Simulation</span>
          </div>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight uppercase italic text-vaultic-cream">Wealth Stress Test</h1>
        <p className="text-vaultic-muted text-sm mt-2 italic">Simulate financial emergencies and measure your resilience threshold.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 max-w-7xl">
        {/* CONTROLS PANEL */}
        <div className="lg:col-span-5 space-y-8">
          {/* Job Loss Simulator */}
          <div className="vaultic-panel p-6 sm:p-8 rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
              <Percent size={18} className="text-vaultic-orange" />
              <label htmlFor="jobLoss" className="text-xs font-bold uppercase tracking-widest text-vaultic-muted">Job Loss Duration</label>
            </div>
            <div className="mb-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-3xl font-black text-vaultic-cream">{jobLossDuration}</span>
                <span className="text-xs text-vaultic-muted font-mono">months</span>
              </div>
              <input
                id="jobLoss"
                type="range"
                min="0"
                max="24"
                step="1"
                value={jobLossDuration}
                onChange={(e) => setJobLossDuration(Number(e.target.value))}
                className="w-full h-2 bg-vaultic-surface/40 rounded-full accent-vaultic-orange cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-vaultic-slate mt-2">
                <span>0 months</span>
                <span>24 months</span>
              </div>
            </div>
          </div>

          {/* Emergency Expense Inflation */}
          <div className="vaultic-panel p-6 sm:p-8 rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
              <TrendingDown size={18} className="text-vaultic-error" />
              <label htmlFor="emergencyInflation" className="text-xs font-bold uppercase tracking-widest text-vaultic-muted">Emergency Inflation Shock</label>
            </div>
            <div className="mb-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-3xl font-black text-vaultic-cream">{emergencyInflation}%</span>
                <span className="text-xs text-vaultic-muted font-mono">expense surge</span>
              </div>
              <input
                id="emergencyInflation"
                type="range"
                min="0"
                max="100"
                step="5"
                value={emergencyInflation}
                onChange={(e) => setEmergencyInflation(Number(e.target.value))}
                className="w-full h-2 bg-vaultic-surface/40 rounded-full accent-vaultic-error cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-vaultic-slate mt-2">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          {/* Investment Return Shock */}
          <div className="vaultic-panel p-6 sm:p-8 rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
              <Zap size={18} className="text-vaultic-warning" />
              <label htmlFor="investmentShock" className="text-xs font-bold uppercase tracking-widest text-vaultic-muted">Investment Return Shock</label>
            </div>
            <div className="mb-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-3xl font-black text-vaultic-cream">{investmentShock}%</span>
                <span className="text-xs text-vaultic-muted font-mono">annual return impact</span>
              </div>
              <input
                id="investmentShock"
                type="range"
                min="-50"
                max="50"
                step="5"
                value={investmentShock}
                onChange={(e) => setInvestmentShock(Number(e.target.value))}
                className="w-full h-2 rounded-full accent-vaultic-error cursor-pointer bg-vaultic-surface/40"
              />
              <div className="flex justify-between text-[9px] text-vaultic-slate mt-2">
                <span>-50%</span>
                <span>+50%</span>
              </div>
            </div>
          </div>

          {/* Market Crash Severity */}
          <div className="vaultic-panel p-6 sm:p-8 rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
              <TrendingDown size={18} className="text-vaultic-error" />
              <label htmlFor="marketCrash" className="text-xs font-bold uppercase tracking-widest text-vaultic-muted">Market Crash Severity</label>
            </div>
            <div className="mb-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-3xl font-black text-vaultic-cream">{marketCrashSeverity}%</span>
                <span className="text-xs text-vaultic-muted font-mono">portfolio impact</span>
              </div>
              <input
                id="marketCrash"
                type="range"
                min="0"
                max="60"
                step="5"
                value={marketCrashSeverity}
                onChange={(e) => setMarketCrashSeverity(Number(e.target.value))}
                className="w-full h-2 bg-vaultic-surface/40 rounded-full accent-vaultic-error cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-vaultic-slate mt-2">
                <span>0%</span>
                <span>60%</span>
              </div>
            </div>
          </div>

          {/* Run Simulation Button */}
          <button
            onClick={runStressTest}
            disabled={simulating}
            className="w-full border border-vaultic-error/40 bg-vaultic-error text-vaultic-ink py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {simulating ? (
              <>
                <RefreshCw className="animate-spin" size={14} />
                Running War-Room Simulation...
              </>
            ) : (
              <>
                <AlertTriangle size={14} />
                Execute Stress Test
              </>
            )}
          </button>
        </div>

        {/* RESULTS PANEL */}
        <div className="lg:col-span-7">
          {result ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Critical Risk Warning */}
              {result.critical_risk && (
                <div className="p-6 bg-vaultic-error/10 border border-vaultic-error/30 rounded-2xl">
                  <p className="text-vaultic-error font-black text-sm uppercase tracking-widest">
                    ⚠️ CRITICAL RISK DETECTED
                  </p>
                  <p className="text-vaultic-error/70 text-xs mt-2">
                    This scenario puts your financial independence at severe risk.
                  </p>
                </div>
              )}

              {/* Severity Badge */}
              <div className={`p-6 border rounded-2xl ${getSeverityColor(result.impact_severity)}`}>
                <p className="text-xs font-black uppercase tracking-widest mb-2">Impact Severity</p>
                <p className="text-2xl font-black uppercase">{result.impact_severity}</p>
              </div>

              {/* Date Comparison */}
              <div className="grid grid-cols-2 gap-4">
                <div className="vaultic-panel p-6 rounded-2xl">
                  <p className="text-[9px] font-mono tracking-widest text-vaultic-muted uppercase mb-3">Baseline Exit</p>
                  <p className="text-2xl font-black text-vaultic-mint">{result.baseline_exit_date}</p>
                </div>
                <div className="vaultic-panel p-6 rounded-2xl">
                  <p className="text-[9px] font-mono tracking-widest text-vaultic-muted uppercase mb-3">Stressed Exit</p>
                  <p className="text-2xl font-black text-vaultic-error">{result.stressed_exit_date}</p>
                </div>
              </div>

              {/* Impact Metrics */}
              <div className="space-y-4">
                <div className="vaultic-panel p-6 rounded-2xl">
                  <p className="text-[9px] font-mono tracking-widest text-vaultic-muted uppercase mb-2">Timeline Delay</p>
                  <p className="text-4xl font-black text-vaultic-orange">{result.months_delayed}</p>
                  <p className="text-vaultic-muted text-xs mt-1">months pushed backward</p>
                </div>

                <div className="vaultic-panel p-6 rounded-2xl">
                  <p className="text-[9px] font-mono tracking-widest text-vaultic-muted uppercase mb-2">Financial Runway Lost</p>
                  <p className="text-4xl font-black text-vaultic-error">{result.years_of_runway_lost.toFixed(1)}</p>
                  <p className="text-vaultic-muted text-xs mt-1">years of independence</p>
                </div>

                <div className="vaultic-panel p-6 rounded-2xl">
                  <p className="text-[9px] font-mono tracking-widest text-vaultic-muted uppercase mb-2">Survival Probability</p>
                  <div className="flex items-center gap-3">
                    <p className="text-4xl font-black text-vaultic-mint">{(result.survival_probability * 100).toFixed(0)}%</p>
                    <div className="flex-1 h-2 bg-vaultic-surface/40 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${result.survival_probability * 100}%` }}
                        className="h-full bg-vaultic-mint"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Recommendation */}
              <div className="bg-vaultic-black/50 border border-vaultic-border p-6 rounded-2xl">
                <p className="text-[10px] font-black uppercase tracking-widest text-vaultic-muted mb-3">Tactical Recommendation</p>
                <p className="text-vaultic-slate text-sm leading-relaxed">
                  {getTacticalRecommendation()}
                </p>
              </div>
            </motion.div>
          ) : (
            <div className="vaultic-panel h-96 rounded-2xl flex flex-col items-center justify-center text-center">
              <AlertTriangle className="text-vaultic-slate mb-4" size={48} />
              <p className="text-vaultic-muted text-sm font-semibold">Configure stress parameters and run simulation</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
