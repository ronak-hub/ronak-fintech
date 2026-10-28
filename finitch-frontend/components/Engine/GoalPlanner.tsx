"use client";
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, Compass, Loader2, ArrowRight, AlertTriangle } from 'lucide-react';
import { getAuthToken } from '@/lib/cookies';

interface PlanInputState {
  goal_name: string;
  goal_amount: string;
  years: string;
}

interface StrategyResult {
  strategy_status: string;
  required_monthly_allocation: number;
  is_cashflow_feasible: boolean;
  allocation_ratio_percentage: number;
  tactical_guidance_log: string;
}

export default function GoalPlanner() {
  const [loading, setLoading] = useState(false);
  const [planInput, setPlanInput] = useState<PlanInputState>({
    goal_name: '',
    goal_amount: '',
    years: ''
  });
  const [strategyResult, setStrategyResult] = useState<StrategyResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const handleGenerateStrategy = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setStrategyResult(null);

    try {
      const token = getAuthToken();
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8001';
      const response = await fetch(`${apiBase}/simulate/plan`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          goal_name: planInput.goal_name,
          goal_amount: parseFloat(planInput.goal_amount),
          years: parseInt(planInput.years),
          income: 0 // Backend defaults back to database profile parameters automatically
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Strategy compilation matrix aborted.");
      }

      setStrategyResult(result);
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "Network handshake failed.";
      setErrorMsg(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="vaultic-panel rounded-3xl p-5 sm:p-8 lg:p-10 max-w-4xl mx-auto w-full backdrop-blur-3xl mt-12">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-10 h-10 bg-vaultic-orange/10 border border-vaultic-orange/20 rounded-xl flex items-center justify-center text-vaultic-orange">
          <Target size={20} />
        </div>
        <div>
          <h3 className="text-vaultic-cream text-lg font-black uppercase tracking-tight italic">Strategic Matrix Planner</h3>
          <p className="text-vaultic-muted text-xs font-light">Formulate high-yield trajectory paths for major capital milestones.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* INPUT CONFIGURATION PANEL */}
        <form onSubmit={handleGenerateStrategy} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-vaultic-muted block mb-2">Milestone Objective</label>
            <input 
              type="text" placeholder="e.g., Venture Capital Pool, Real Estate Exit" required
              className="vaultic-input w-full p-4 rounded-2xl outline-none text-xs tracking-wide font-medium"
              value={planInput.goal_name}
              onChange={(e) => setPlanInput({...planInput, goal_name: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-vaultic-muted block mb-2">Target Capital (₹)</label>
              <input 
                type="number" placeholder="Amount" required
                className="vaultic-input w-full p-4 rounded-2xl outline-none text-xs font-medium"
                value={planInput.goal_amount}
                onChange={(e) => setPlanInput({...planInput, goal_amount: e.target.value})}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-vaultic-muted block mb-2">Time Horizon (Years)</label>
              <input 
                type="number" placeholder="Duration" required max="40"
                className="vaultic-input w-full p-4 rounded-2xl outline-none text-xs font-medium"
                value={planInput.years}
                onChange={(e) => setPlanInput({...planInput, years: e.target.value})}
              />
            </div>
          </div>

          <button 
            disabled={loading}
            className="vaultic-btn-primary w-full py-4 rounded-2xl text-[10px] uppercase tracking-widest group mt-6 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={14} /> : (
              <>
                Compute Strategic Route
                <Compass size={14} className="group-hover:rotate-45 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* REACTION TERMINAL LOG */}
        <div className="bg-vaultic-black/50 border border-vaultic-border rounded-3xl p-6 flex flex-col justify-between min-h-[220px] relative overflow-hidden">
          {errorMsg && (
            <div className="flex items-start gap-3 text-vaultic-error text-xs italic bg-vaultic-error/10 border border-vaultic-error/20 p-4 rounded-xl">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <p>{errorMsg}</p>
            </div>
          )}

          {!strategyResult && !errorMsg && (
            <div className="flex flex-col items-center justify-center h-full text-center py-10 opacity-20">
              <ArrowRight size={28} className="text-vaultic-muted mb-2 animate-pulse rotate-90" />
              <p className="text-[10px] font-mono uppercase tracking-widest text-vaultic-muted">Awaiting target parameter compilation matrix...</p>
            </div>
          )}

          {strategyResult && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 h-full flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[9px] font-mono tracking-widest text-vaultic-muted uppercase">Strategy Vector Output</span>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${strategyResult.is_cashflow_feasible ? 'bg-vaultic-success/10 text-vaultic-success border border-vaultic-success/20' : 'bg-vaultic-orange/10 text-vaultic-orange border border-vaultic-orange/20'}`}>
                    {strategyResult.strategy_status}
                  </span>
                </div>
                <p className="text-xs text-vaultic-slate leading-relaxed font-light tracking-wide italic">
                  &quot;{strategyResult.tactical_guidance_log}&quot;
                </p>
              </div>

              {strategyResult.is_cashflow_feasible && (
                <div className="pt-4 border-t border-vaultic-border flex justify-between items-baseline">
                  <span className="text-[10px] font-bold text-vaultic-muted uppercase tracking-wider">Required Allocation:</span>
                  <span className="text-2xl font-black text-vaultic-cream tracking-tight">
                    ₹{strategyResult.required_monthly_allocation.toLocaleString('en-IN')}
                    <span className="text-[10px] text-vaultic-muted font-medium">/mo</span>
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
