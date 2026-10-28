"use client";
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Zap,
    AlertTriangle, Cpu, Terminal
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import DNACalibrator from '@/components/Dashboard/DNACalibrator';
import GoalPlanner from '@/components/Engine/GoalPlanner';
import DashboardSummaryCards from '@/components/Dashboard/DashboardSummaryCards';
import DashboardCommandBar from '@/components/Dashboard/DashboardCommandBar';
import { getAuthToken } from '@/lib/cookies';
import { getEffectiveSavingsAmount, hasMeaningfulWizardData, readStoredWizardData, readStoredWizardStep } from '@/lib/finance';
import DashboardSidebar from '@/components/Dashboard/DashboardSidebar';
import FinancialProfile from '@/components/Dashboard/FinancialProfile';
import RecentTransactions from '@/components/Dashboard/RecentTransactions';
import ActiveGoals from '@/components/Dashboard/ActiveGoals';
import SpendingBreakdown from '@/components/Dashboard/SpendingBreakdown';
import CapitalEvaporationCard from '@/components/Dashboard/CapitalEvaporationCard';
import FreedomVelocityCard from '@/components/Dashboard/FreedomVelocityCard';
import { PermissionCenter } from '@/components/Dashboard/PermissionCenter';

interface DashboardPulseData {
  nudges?: string[];
  overall_health_score?: number;
  daily_safe_budget?: number;
  wealth_leaks?: {
    daily_lazy_cash_loss?: number;
    monthly_impact?: number;
  };
  freedom_data?: {
    exit_date?: string;
    years_remaining?: number;
    total_months?: number;
  };
  streak_data?: {
    current_streak?: number;
    status?: string;
  };
  destiny_summary_log?: string;
  user_profile?: {
    monthly_income?: number;
    rent?: number;
    emis?: number;
    insurance?: number;
    current_bank_balance?: number;
    target_savings_rate?: number;
  };
  recent_transactions?: {
    id: number;
    merchant: string;
    amount: number;
    category: string;
    timestamp: string;
  }[];
  user_goals?: {
    id: number;
    goal_name: string;
    target_amount: number;
    years: number;
    required_sip: number;
  }[];
  spending_by_category?: { [key: string]: number };
}

interface DashboardDNAInput {
  monthly_income: number;
  fixed_expenses: number;
  bank_balance: number;
  target_savings_rate: number;
  primary_goal: string;
  goal_amount: number;
  savings_amount?: number;
  expenses?: Array<{ category?: string; amount?: number | string }>;
  wizard_step?: number;
}

const getApiBaseCandidates = () => {
    const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
    return Array.from(new Set([
        configured,
        'http://127.0.0.1:8001',
        'http://127.0.0.1:8002',
        'http://localhost:8001',
        'http://localhost:8002',
    ].filter(Boolean) as string[]));
};

export default function VaulticDashboard() {
    const [backendSetup, setBackendSetup] = useState(false);
    const [pulse, setPulse] = useState<DashboardPulseData | null>(null);
    const [wizardData, setWizardData] = useState<{
        monthly_income?: number | string;
        bank_balance?: number | string;
        fixed_expenses?: number | string;
        target_savings_rate?: number | string;
        savings_amount?: number | string;
        primary_goal?: string;
        goal_amount?: number | string;
        expenses?: Array<{ category?: string; amount?: number | string }>;
    } | null>(null);
    const [hasWizardSetup, setHasWizardSetup] = useState(false);
    const isSetup = backendSetup || hasWizardSetup;
    const [showLeakModal, setShowLeakModal] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentStreak = pulse?.streak_data?.current_streak ?? 0;
    const streakStatus = pulse?.streak_data?.status ?? (currentStreak > 0 ? 'ON FIRE' : 'REBOOTING');

    const checkStatus = useCallback(async () => {
        const token = getAuthToken();
        if (!token) {
            setIsLoading(false);
            router.replace('/login');
            return;
        }

        try {
            const apiBases = getApiBaseCandidates();
            let res: Response | null = null;
            let lastError: unknown = null;

            for (const apiBase of apiBases) {
                try {
                    res = await fetch(`${apiBase}/dashboard/summary`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok || res.status === 401 || res.status === 403) {
                        break;
                    }
                } catch (error) {
                    lastError = error;
                }
            }

            if (!res) {
                throw lastError ?? new Error('No dashboard endpoint available');
            }

            if (res.status === 401) {
                setIsLoading(false);
                router.replace('/login');
                return;
            }

            const result = await res.json();

            if (res.ok) {
                // Compute overall_health_score if not provided by backend
                if (!result.overall_health_score && result.user_profile) {
                    const { monthly_income, rent, emis, insurance } = result.user_profile;
                    const totalExpenses = (rent || 0) + (emis || 0) + (insurance || 0);
                    result.overall_health_score = monthly_income && monthly_income > 0
                        ? Math.max(0, Math.round(((monthly_income - totalExpenses) / monthly_income) * 100))
                        : 0;
                }
                setPulse(result);
                const profile = result.user_profile;
                const hasIncome = profile?.monthly_income && profile.monthly_income > 0;
                const hasBalance = profile?.current_bank_balance && profile.current_bank_balance > 0;
                const hasWizardSnapshot = Boolean(profile?.wizard_snapshot && Object.keys(profile.wizard_snapshot).length > 0);
                setBackendSetup(hasIncome || hasBalance || hasWizardSnapshot);
            } else {
                setBackendSetup(false);
            }
        } catch {
            console.error("Vaultic Brain Offline.");
            setBackendSetup(false);
        } finally {
            setIsLoading(false);
        }
    }, [router]);

    const initialWizardStep = useMemo(() => {
        const rawStep = searchParams?.get('wizardStep');
        const stepNumber = Number(rawStep);
        return [1, 2, 3].includes(stepNumber) ? stepNumber : 1;
    }, [searchParams]);

    const isWizardPreview = Boolean(searchParams?.get('wizardStep'));

    useEffect(() => {
        void checkStatus();
    }, [checkStatus]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const readWizardData = () => {
            const stored = readStoredWizardData();
            const stepNum = readStoredWizardStep();
            const isWizardInProgress = [1, 2].includes(Number(stepNum));

            if (!stored) {
                setWizardData(null);
                setHasWizardSetup(false);
                return;
            }

            setWizardData(stored);
            setHasWizardSetup(!isWizardInProgress && hasMeaningfulWizardData(stored));
        };

        readWizardData();
        window.addEventListener('vaulticDnaInputsUpdated', readWizardData);
        return () => window.removeEventListener('vaulticDnaInputsUpdated', readWizardData);
    }, []);

    const wizardSnapshot = (pulse?.user_profile as { wizard_snapshot?: Record<string, unknown> } | undefined)?.wizard_snapshot;
    const monthlyIncome = Number(wizardData?.monthly_income ?? wizardSnapshot?.monthly_income ?? pulse?.user_profile?.monthly_income ?? 0);
    const bankBalance = Number(wizardData?.bank_balance ?? wizardSnapshot?.bank_balance ?? pulse?.user_profile?.current_bank_balance ?? 0);
    const fixedExpenses = Number(
        wizardData?.fixed_expenses ??
        wizardSnapshot?.fixed_expenses ??
        (pulse?.user_profile
            ? (pulse.user_profile.rent || 0) + (pulse.user_profile.emis || 0) + (pulse.user_profile.insurance || 0)
            : 0
        ),
    );
    const targetSavingsRate = Number(wizardData?.target_savings_rate ?? wizardSnapshot?.target_savings_rate ?? pulse?.user_profile?.target_savings_rate ?? 0.3);
    const savingsAmount = Number(wizardData?.savings_amount ?? wizardSnapshot?.savings_amount ?? getEffectiveSavingsAmount(wizardData ?? undefined));
    const primaryGoal = wizardData?.primary_goal ?? pulse?.freedom_data?.exit_date ?? 'Build your first savings goal';

    const computedSafeSpend = Math.max(Math.round((monthlyIncome - fixedExpenses - savingsAmount) / 30), 0);
    const computedHealthScore = monthlyIncome > 0 ? Math.max(0, Math.round(((monthlyIncome - fixedExpenses) / monthlyIncome) * 100)) : 0;
    const dailySafeBudget = pulse?.daily_safe_budget ?? computedSafeSpend;
    const healthScore = pulse?.overall_health_score ?? computedHealthScore;
    const nextGoal = pulse?.freedom_data?.exit_date || primaryGoal;

    const wizardSpendingByCategory = useMemo(() => {
        if (!wizardData?.expenses?.length) return undefined;
        return wizardData.expenses.reduce<Record<string, number>>((acc, expense) => {
            const amount = Number(expense.amount) || 0;
            const category = expense.category?.trim();
            if (!amount || !category) return acc;
            acc[category] = (acc[category] || 0) + amount;
            return acc;
        }, {});
    }, [wizardData]);

    const spendingByCategory = pulse?.spending_by_category && Object.keys(pulse.spending_by_category).length > 0
        ? pulse.spending_by_category
        : wizardSpendingByCategory;

    const displayGoals = pulse?.user_goals && pulse.user_goals.length > 0
        ? pulse.user_goals
        : wizardData?.primary_goal
            ? [{
                id: 1,
                goal_name: wizardData.primary_goal,
                target_amount: Number(wizardData.goal_amount) || 0,
                years: 1,
                required_sip: Math.max(0, Math.round((Number(wizardData.goal_amount) || 0) / 12)),
            }]
            : undefined;

    // Local Algorithmic Command Parser 
    const handleCommandExecute = (query: string) => {
        const cmd = query.toLowerCase();
        if (cmd.includes('leak') || cmd.includes('spend') || cmd.includes('waste')) {
            return `You may be leaking about ₹${pulse?.wealth_leaks?.daily_lazy_cash_loss || 0} each day. Try moving some of that amount into savings or debt payoff.`;
        }
        if (cmd.includes('goal') || cmd.includes('freedom') || cmd.includes('target')) {
            return `Your goal timeline is around ${pulse?.freedom_data?.exit_date || 'a later date'} with about ${pulse?.freedom_data?.years_remaining || 0} years left. Small monthly savings can move this forward.`;
        }
        if (cmd.includes('budget') || cmd.includes('safe') || cmd.includes('today')) {
            return `You can safely spend about ₹${pulse?.daily_safe_budget || 0} today without going off track.`;
        }
        if (cmd.includes('score') || cmd.includes('health')) {
            return `Your current money health score is ${pulse?.overall_health_score || 0}/100. The main opportunity is to use extra money consistently.`;
        }
        return `Try asking about your spend, savings goal, or safe daily budget.`;
    };

    const handleDNAComplete = async (dnaData: DashboardDNAInput | null) => {
        if (!dnaData) {
            return;
        }

        const token = getAuthToken();
        setIsLoading(true);
        
        const apiBases = getApiBaseCandidates();
        try {
            let res: Response | null = null;
            let lastError: unknown = null;

            for (const apiBase of apiBases) {
                try {
                    res = await fetch(`${apiBase}/user/setup`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(dnaData)
                    });
                    if (res.ok || res.status === 401 || res.status === 403) {
                        break;
                    }
                } catch (error) {
                    lastError = error;
                }
            }

            if (res?.ok || res?.status === 401 || res?.status === 403) {
                setHasWizardSetup(true);
                setBackendSetup(true);
                await checkStatus();
                router.replace('/dashboard');
            } else {
                setHasWizardSetup(true);
                setBackendSetup(true);
                await checkStatus();
                router.replace('/dashboard');
            }
        } catch (error) {
            console.warn('DNA setup sync skipped; proceeding locally.', error);
            setHasWizardSetup(true);
            setBackendSetup(true);
            setIsLoading(false);
            router.replace('/dashboard');
        }
    };

    if (isLoading) return (
        <div className="min-h-screen bg-vaultic-black flex flex-col items-center justify-center gap-4">
            <Cpu className="animate-spin text-vaultic-orange" size={40} />
            <p className="text-vaultic-orange font-black uppercase tracking-[0.4em] text-[10px]">Loading your money overview...</p>
        </div>
    );

    return (
        <div className="min-h-screen min-w-0 bg-vaultic-black p-0 text-vaultic-cream selection:bg-vaultic-orange/30">
            {(isWizardPreview || !isSetup) && <DNACalibrator onComplete={handleDNAComplete} initialStep={initialWizardStep} />}

            <AnimatePresence>
                {showLeakModal && (
                    <div className="fixed inset-0 z-[100] bg-vaultic-black/90 backdrop-blur-2xl flex items-center justify-center p-6">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="vaultic-panel max-w-md w-full p-8 sm:p-10 rounded-3xl text-center">
                            <AlertTriangle className="text-vaultic-orange mx-auto mb-8" size={56} />
                            <h3 className="text-3xl font-black italic uppercase tracking-tighter mb-4 text-vaultic-cream">Intervention</h3>
                            <p className="text-vaultic-muted text-sm leading-relaxed mb-10">
                                Autonomous Agent detected <span className="text-vaultic-cream font-bold">₹{pulse?.wealth_leaks?.monthly_impact || 0}</span> evaporating in idle accounts.
                            </p>
                            <button onClick={() => setShowLeakModal(false)} className="vaultic-btn-primary w-full py-4 rounded-2xl text-xs uppercase tracking-widest">Authorize Agent</button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <div className="w-full max-w-full px-4 py-6 sm:px-6 lg:px-8 overflow-x-hidden">
                <div className="lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start lg:gap-8">
                    <DashboardSidebar currentStreak={currentStreak} streakStatus={streakStatus} />

                    <main className="flex-1 min-w-0 min-h-screen overflow-y-auto p-4 pt-28 pb-14 sm:p-6 md:p-8 xl:p-10">
                    <header className="flex flex-col gap-6 md:flex-row md:justify-between md:items-start mb-10 lg:mb-14">
                        <div className="flex flex-col gap-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <h1 className="text-4xl sm:text-5xl font-black tracking-tight uppercase italic text-vaultic-cream">Your money overview</h1>
                                <p className="text-vaultic-muted text-sm mt-4 italic flex items-center gap-2">
                                    <Zap size={14} className="text-vaultic-orange" fill="currentColor"/> {pulse?.nudges?.[0]}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="vaultic-panel p-5 sm:px-8 rounded-3xl text-left md:text-right">
                        <p className="text-[9px] text-vaultic-orange font-black uppercase tracking-[0.3em] mb-2 italic">Safe spend today</p>
                        <p className="whitespace-nowrap text-4xl font-black text-vaultic-cream tracking-tighter italic">₹{pulse?.daily_safe_budget || 0}</p>
                    </div>
                </header>

                <DashboardSummaryCards
                    dailySafeBudget={dailySafeBudget}
                    healthScore={healthScore}
                    nextGoal={nextGoal}
                />

                <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                    <DashboardCommandBar onAsk={handleCommandExecute} />
                    <div className="rounded-[1.75rem] border border-vaultic-border/70 bg-vaultic-surface/80 p-5 shadow-lg shadow-black/10">
                        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.35em] text-vaultic-muted">
                            <Terminal size={14} className="text-vaultic-cyan" />
                            Quick insight
                        </div>
                        <p className="mt-4 text-sm leading-7 text-vaultic-muted">
                            {pulse?.destiny_summary_log || 'Your dashboard is ready. Add your income and bills to get focused guidance.'}
                        </p>
                    </div>
                </div>

                <div className="mt-8">
                    <PermissionCenter />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8 mt-8">
                    <CapitalEvaporationCard 
                        dailyLoss={pulse?.wealth_leaks?.daily_lazy_cash_loss}
                        onPlugLeak={() => setShowLeakModal(true)}
                    />
                    <FreedomVelocityCard 
                        healthScore={pulse?.overall_health_score}
                        freedomData={pulse?.freedom_data}
                        wealthLeaks={pulse?.wealth_leaks}
                    />
                </div>

                <FinancialProfile
                    userProfile={{
                        monthly_income: monthlyIncome,
                        fixed_expenses: fixedExpenses,
                        current_bank_balance: bankBalance,
                        target_savings_rate: targetSavingsRate,
                    }}
                />

                <RecentTransactions transactions={pulse?.recent_transactions} />

                <ActiveGoals goals={pulse?.user_goals} />

                <SpendingBreakdown spendingByCategory={spendingByCategory} />

                <GoalPlanner />
                </main>
            </div>
        </div>
        </div>
    );
}
