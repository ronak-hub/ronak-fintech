"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { getAuthToken } from '@/lib/cookies';
import { persistWizardData, readStoredWizardData, readStoredWizardStep, computeGoalPrediction } from '@/lib/finance';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, TrendingUp, ArrowLeft, ArrowRight, CheckCircle2, Plus, Trash2 } from 'lucide-react';

interface DNACalibratorState {
    monthly_income: string;
    fixed_expenses: string;
    bank_balance: string;
    target_savings_rate: string;
    savings_amount: string;
    primary_goal: string;
    goal_amount: string;
}

interface DNACalibratorPayload {
    monthly_income: number;
    fixed_expenses: number;
    bank_balance: number;
    target_savings_rate: number;
    savings_amount: number;
    primary_goal: string;
    goal_amount: number;
    expenses?: ExpenseItem[];
    wizard_step?: number;
}

interface ExpenseItem {
    id: string;
    amount: string;
    category: string;
}

const EXPENSE_CATEGORIES = [
    'Rent',
    'EMI (Loan)',
    'Insurance',
    'Utilities',
    'Groceries',
    'Transport',
    'Entertainment',
    'Subscriptions',
    'Healthcare',
    'Dining Out',
    'Shopping',
    'Other'
];

const DEFAULT_DNA_STATE: DNACalibratorState = {
    monthly_income: '',
    fixed_expenses: '',
    bank_balance: '',
    target_savings_rate: '0.30',
    savings_amount: '',
    primary_goal: 'Financial Freedom',
    goal_amount: '',
};

const parseSavedWizardState = () => {
    const saved = readStoredWizardData();
    const savedStep = readStoredWizardStep();

    let step = 1;
    if ([1, 2, 3].includes(Number(savedStep))) {
        step = Number(savedStep);
    }

    let dna = DEFAULT_DNA_STATE;
    let expenses: ExpenseItem[] = [];

    if (saved) {
        try {
            const parsed = saved as {
                monthly_income?: string;
                fixed_expenses?: string | number;
                bank_balance?: string;
                target_savings_rate?: string;
                savings_amount?: string;
                primary_goal?: string;
                goal_amount?: string | number;
                expenses?: unknown;
            };
            dna = {
                monthly_income: parsed.monthly_income ?? DEFAULT_DNA_STATE.monthly_income,
                fixed_expenses: String(parsed.fixed_expenses ?? DEFAULT_DNA_STATE.fixed_expenses),
                bank_balance: parsed.bank_balance ?? DEFAULT_DNA_STATE.bank_balance,
                target_savings_rate: parsed.target_savings_rate ?? DEFAULT_DNA_STATE.target_savings_rate,
                savings_amount: parsed.savings_amount ?? DEFAULT_DNA_STATE.savings_amount,
                primary_goal: parsed.primary_goal ?? DEFAULT_DNA_STATE.primary_goal,
                goal_amount: String(parsed.goal_amount ?? DEFAULT_DNA_STATE.goal_amount),
            };

            if (Array.isArray(parsed.expenses)) {
                expenses = parsed.expenses.map((item) => {
                    const expense = item as { id?: string; amount?: string | number; category?: string };
                    return {
                        id: typeof expense.id === 'string' ? expense.id : `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                        amount: String(expense.amount ?? ''),
                        category: String(expense.category ?? 'Rent'),
                    };
                });
            }
        } catch {
            // ignore invalid saved data
        }
    }

    return { dna, expenses, step };
};

interface DNACalibratorProps {
    onComplete: (dna: DNACalibratorPayload | null) => void;
    initialStep?: number;
}

export default function DNACalibrator({ onComplete, initialStep }: Readonly<DNACalibratorProps>) {
    const router = useRouter();
    const saved = parseSavedWizardState();
    const [step, setStep] = useState(initialStep && [1, 2, 3].includes(initialStep) ? initialStep : saved.step);
    const [dna, setDna] = useState<DNACalibratorState>(saved.dna);
    const [expenses, setExpenses] = useState<ExpenseItem[]>(saved.expenses);

    useEffect(() => {
        const originalBodyOverflow = document.body.style.overflow;
        const originalHtmlOverflow = document.documentElement.style.overflow;
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = originalBodyOverflow;
            document.documentElement.style.overflow = originalHtmlOverflow;
        };
    }, []);

    const goals = [
        { id: 'Financial Freedom', icon: CheckCircle2, label: 'FIRE / Freedom', route: '/dashboard/goal/financial-freedom' },
        { id: 'Luxury Travel', icon: Target, label: 'World Tour', route: '/dashboard/goal/luxury-travel' },
        { id: 'Special Commodities', icon: TrendingUp, label: 'Special Commodities', route: '/dashboard/goal/special-commodities' },
    ];

    const computePrediction = (goalId: string) =>
        computeGoalPrediction(goalId, {
            monthlyIncome: incomeValue,
            fixedExpenses: totalFixedExpenses,
            savingsAmount: monthlySavingValue,
            bankBalance: balanceValue,
            explicitGoal: Number(dna.goal_amount) || 0,
            targetSavingsRate: Number.parseFloat(dna.target_savings_rate) || 0.3,
        });

    const addExpense = useCallback(() => {
        setExpenses((current) => [...current, { id: Date.now().toString(), amount: '', category: 'Rent' }]);
    }, []);

    const removeExpense = useCallback((id: string) => {
        setExpenses((current) => current.filter((expense) => expense.id !== id));
    }, []);

    const updateExpense = useCallback((id: string, field: 'amount' | 'category', value: string) => {
        setExpenses((current) => current.map((expense) => (expense.id === id ? { ...expense, [field]: value } : expense)));
    }, []);

    const incomeValue = Number.parseFloat(dna.monthly_income) || 0;
    const balanceValue = Number.parseFloat(dna.bank_balance) || 0;
    const enteredSavingsValue = Number.parseFloat(dna.savings_amount) || 0;
    // Determine monthly saving to display/use: if enteredSavingsValue <= income, it's monthly; otherwise fallback to rate-based monthly
    const monthlySavingValue = enteredSavingsValue > 0 && enteredSavingsValue <= incomeValue ? enteredSavingsValue : Math.round(incomeValue * (Number.parseFloat(dna.target_savings_rate) || 0.3));
    const savingsRatePercent = Math.round((Number.parseFloat(dna.target_savings_rate) || 0.3) * 100);
    const totalFixedExpenses = expenses.reduce((sum, e) => sum + (Number.parseFloat(e.amount) || 0), 0);
    const monthlySurplus = Math.max(incomeValue - totalFixedExpenses, 0);
    const remainingAfterSavings = Math.max(incomeValue - monthlySavingValue, 0);
    const incomeDisplayClass = incomeValue > 0 ? 'text-vaultic-mint' : 'text-vaultic-cream';
    const balanceDisplayClass = balanceValue > 0 ? 'text-vaultic-mint' : 'text-vaultic-cream';
    const expenseDisplayClass = totalFixedExpenses > 0 ? 'text-vaultic-error' : 'text-vaultic-muted';
    const surplusDisplayClass = monthlySurplus > 0 ? 'text-vaultic-mint' : 'text-vaultic-orange';

    useEffect(() => {
        if (globalThis.window === undefined) return;

        persistWizardData({
            monthly_income: dna.monthly_income,
            bank_balance: dna.bank_balance,
            fixed_expenses: totalFixedExpenses,
            target_savings_rate: dna.target_savings_rate,
            savings_amount: dna.savings_amount,
            primary_goal: dna.primary_goal,
            goal_amount: dna.goal_amount,
            expenses,
        }, step);
    }, [dna, totalFixedExpenses, expenses, step]);

    const nextStep = () => {
        if (step === 1 && !dna.monthly_income) return;
        if (step === 2 && expenses.length === 0) return;

        if (step === 1 && expenses.length === 0) {
            setExpenses([{ id: Date.now().toString(), amount: '', category: 'Rent' }]);
        }

        if (step < 3) {
            setStep(step + 1);
        } else {
            const primaryGoal = dna.primary_goal || 'Financial Freedom';
            const goalPrediction = computePrediction(primaryGoal);
            const formattedDna = {
                monthly_income: incomeValue,
                fixed_expenses: totalFixedExpenses,
                bank_balance: balanceValue,
                target_savings_rate: Number.parseFloat(dna.target_savings_rate) || 0.3,
                savings_amount: Number.parseFloat(dna.savings_amount) || 0,
                primary_goal: primaryGoal,
                goal_amount: goalPrediction.target,
                expenses,
                wizard_step: 3,
            };
            onComplete(formattedDna);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-vaultic-black/95 backdrop-blur-2xl">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,_rgba(var(--accent-rgb),0.14),transparent_55%)]" />
            <div className="pointer-events-none absolute right-0 bottom-0 h-72 w-72 rounded-full bg-vaultic-mint/10 blur-3xl" />
            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                className="vaultic-panel relative max-w-[calc(100vw-1rem)] md:max-w-5xl w-full max-h-[calc(100vh-4rem)] xl:max-h-[calc(100vh-3rem)] h-full overflow-hidden rounded-2xl shadow-[0_0_40px_rgba(var(--accent-rgb),0.12)] border-vaultic-orange/10"
            >
                <div className="grid h-full min-h-0 grid-cols-1 gap-3 p-3 md:p-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(17rem,0.85fr)]">
                    <div className="flex flex-col gap-4">
                        <div className="flex-shrink-0 flex flex-col gap-3 items-center">
                            <div className="flex flex-col items-center gap-3">
                                <div className="flex gap-2 justify-center">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className={`h-1.5 w-12 rounded-full transition-all duration-500 ${step >= i ? 'bg-vaultic-orange shadow-[0_0_15px_rgba(var(--accent-rgb),0.6)]' : 'bg-vaultic-surface/40'}`} />
                                    ))}
                                </div>
                                <div className="text-xs uppercase tracking-[0.35em] text-vaultic-muted">Step {step} of 3</div>
                            </div>
                            <div className="flex w-full max-w-sm shrink-0 gap-3 xl:hidden">
                                {step !== 1 && (
                                    <button
                                        type="button"
                                        onClick={() => setStep((prev) => Math.max(prev - 1, 1))}
                                        className="vaultic-btn-secondary flex-1 rounded-2xl py-4 text-xs uppercase tracking-widest"
                                    >
                                        <ArrowLeft size={16} /> Back
                                    </button>
                                )}
                                {step !== 2 && (
                                    <button
                                        type="button"
                                        onClick={nextStep}
                                        disabled={
                                            (step === 1 && !dna.monthly_income) ||
                                            (step === 2 && expenses.length === 0)
                                        }
                                        className="vaultic-btn-primary flex-1 rounded-2xl py-4 text-xs uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        {step === 3 ? 'Finish' : 'Next'} <ArrowRight size={16} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 min-h-0 overflow-hidden rounded-[2.5rem] border border-vaultic-border bg-gradient-to-br from-vaultic-black/90 via-vaultic-surface/40 to-vaultic-ink/80">
                            <div className="h-full min-h-0 overflow-y-auto pr-1 pb-4 max-h-[calc(100vh-8rem)]">
                                <AnimatePresence mode="wait">
                                    {step === 1 && (
                                        <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: -20 }} className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(17rem,0.95fr)] items-start px-3 py-4 md:px-5 md:py-5">
                                            <div className="space-y-3 md:space-y-4">
                                                <h2 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase leading-none text-vaultic-cream">Fuel Your <br/><span className="text-vaultic-orange">Cash Flow.</span></h2>
                                                <div className="space-y-2">
                                                    <label htmlFor="monthly-income" className="text-xs uppercase tracking-[0.35em] text-vaultic-muted">Monthly Income</label>
                                                    <input 
                                                        id="monthly-income"
                                                        type="number" 
                                                        placeholder="₹ MONTHLY_INCOME" 
                                                        className={`vaultic-input w-full p-3 rounded-2xl text-center text-2xl font-black ${incomeDisplayClass}`}
                                                        value={dna.monthly_income} 
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDna({...dna, monthly_income: e.target.value})} 
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label htmlFor="bank-balance" className="text-xs uppercase tracking-[0.35em] text-vaultic-muted">Current Bank Balance</label>
                                                    <input
                                                        id="bank-balance"
                                                        type="number"
                                                        placeholder="₹ CURRENT BANK BALANCE"
                                                        className={`vaultic-input w-full p-3 rounded-2xl text-center text-lg font-bold ${balanceDisplayClass}`}
                                                        value={dna.bank_balance}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDna({...dna, bank_balance: e.target.value})}
                                                    />
                                                    <p className="text-sm text-vaultic-muted italic">Liquid funds available before monthly allocation</p>
                                                </div>
                                                <div className="space-y-2">
                                                    <label htmlFor="savings-amount" className="text-xs uppercase tracking-[0.35em] text-vaultic-muted">Savings Amount</label>
                                                    <input
                                                        id="savings-amount"
                                                        type="number"
                                                        placeholder="₹ How much do you want to save?"
                                                        className="vaultic-input w-full p-3 rounded-2xl text-center text-lg font-bold text-vaultic-mint"
                                                        value={dna.savings_amount}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                            const val = e.target.value;
                                                            setDna({ ...dna, savings_amount: val });
                                                        }}
                                                    />
                                                    <p className="text-sm text-vaultic-muted italic">Monthly amount you plan to save or invest each month.</p>
                                                </div>
                                                <div className="space-y-2">
                                                    <label htmlFor="target-savings-rate" className="text-xs uppercase tracking-[0.35em] text-vaultic-muted">Target Savings Rate (%)</label>
                                                    <input
                                                        id="target-savings-rate"
                                                        type="number"
                                                        min={0}
                                                        max={100}
                                                        step={1}
                                                        value={savingsRatePercent}
                                                        onChange={(e) => {
                                                            const value = Number(e.target.value) / 100;
                                                            setDna({ ...dna, target_savings_rate: value.toFixed(2) });
                                                        }}
                                                        className="vaultic-input w-full p-3 rounded-2xl text-center text-base font-bold outline-none"
                                                    />
                                                    <p className="text-sm text-vaultic-muted italic">Choose the percentage of your cash flow you want Vaultic to save each month.</p>
                                                </div>
                                            </div>
                                            <div className="vaultic-stat-card rounded-[1.5rem] p-4 md:p-5 border-vaultic-mint/20 self-start">
                                                <p className="text-xs uppercase tracking-[0.35em] text-vaultic-mint mb-3">Lifetime savings goal</p>
                                                <p className="text-sm leading-6 text-vaultic-slate mb-4">Enter the total amount you want to save during your lifetime. This represents your life goal and will be used as your long-term target across Vaultic.</p>
                                                <div className="grid gap-3 rounded-2xl bg-vaultic-black/70 border border-vaultic-orange/10 p-4 text-center">
                                                    <div>
                                                        <p className="text-sm uppercase tracking-[0.35em] text-vaultic-muted">Income entered</p>
                                                        <p className={`mt-2 text-2xl font-black ${incomeDisplayClass}`}>₹{incomeValue.toLocaleString('en-IN')}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm uppercase tracking-[0.35em] text-vaultic-muted">Remaining after savings</p>
                                                        <p className={`mt-2 text-2xl font-black ${remainingAfterSavings >= 0 ? 'text-vaultic-mint' : 'text-vaultic-error'}`}>₹{remainingAfterSavings.toLocaleString('en-IN')}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm uppercase tracking-[0.35em] text-vaultic-muted">Target goal</p>
                                                        <p className={`mt-2 text-2xl font-black ${Number(dna.goal_amount || dna.savings_amount) > 0 ? 'text-vaultic-cyan' : 'text-vaultic-cream'}`}>
                                                            ₹{(Number(dna.goal_amount) > 0 ? Number(dna.goal_amount) : Number(dna.savings_amount || 0)).toLocaleString('en-IN')}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm uppercase tracking-[0.35em] text-vaultic-muted">Required monthly</p>
                                                        <p className={`mt-2 text-2xl font-black text-vaultic-mint`}>₹{computePrediction(dna.primary_goal).required_sip.toLocaleString('en-IN')}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {step === 2 && (
                                        <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: -20 }} className="grid gap-6 px-3 py-4 md:px-5 md:py-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(16rem,0.95fr)] items-start">
                                            <div className="min-w-0 space-y-4 md:space-y-5">
                                                <div className="text-center md:text-left">
                                                    <h2 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase text-vaultic-cream leading-none mb-3">Break Down Your <br/><span className="text-vaultic-orange">Fixed Spend.</span></h2>
                                                    <p className="text-sm text-vaultic-muted italic">Add your recurring expenses and their monthly amounts.</p>
                                                </div>

                                                <div className="max-h-[calc(100vh-12rem)] md:max-h-[calc(100vh-12rem)] space-y-3 overflow-y-auto pr-1 md:pr-2">
                                                    {expenses.map((expense) => (
                                                        <motion.div 
                                                            key={expense.id}
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            className="flex flex-col gap-3 rounded-2xl border-vaultic-cyan/15 p-4 vaultic-stat-card md:flex-row md:items-center"
                                                        >
                                                            <div className="min-w-0 flex-1 md:min-w-[11rem]">
                                                                <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-vaultic-muted md:hidden">
                                                                    Category
                                                                </label>
                                                                <select 
                                                                    aria-label="Expense category selection"
                                                                    title="Select expense category"
                                                                    value={expense.category}
                                                                    onChange={(e) => updateExpense(expense.id, 'category', e.target.value)}
                                                                    className="vaultic-input vaultic-select w-full min-w-[11rem] p-3 rounded-lg text-sm font-bold outline-none"
                                                                >
                                                                    {EXPENSE_CATEGORIES.map(cat => (
                                                                        <option key={cat} value={cat}>{cat}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div className="min-w-0 md:w-40 md:flex-none">
                                                                <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-vaultic-muted md:hidden">
                                                                    Amount
                                                                </label>
                                                                <input 
                                                                    type="text"
                                                                    inputMode="numeric"
                                                                    pattern="[0-9]*"
                                                                    placeholder="₹ Amount"
                                                                    value={expense.amount}
                                                                    onChange={(e) => updateExpense(expense.id, 'amount', e.target.value)}
                                                                    className="vaultic-input w-full p-3 rounded-lg font-bold outline-none text-right pr-8 appearance-none"
                                                                />
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeExpense(expense.id)}
                                                                aria-label="Remove expense"
                                                                className="inline-flex h-12 w-12 shrink-0 items-center justify-center self-end rounded-lg border border-vaultic-error/30 bg-vaultic-error/20 p-3 transition hover:bg-vaultic-error/30 md:self-center"
                                                            >
                                                                <Trash2 size={16} className="text-vaultic-error" />
                                                            </button>
                                                        </motion.div>
                                                    ))}
                                                </div>

                                                <button
                                                    onClick={addExpense}
                                                    type="button"
                                                    className="vaultic-btn-secondary w-full p-4 rounded-2xl text-sm"
                                                >
                                                    <Plus size={18} /> Add Expense Category
                                                </button>

                                                <div className="bg-gradient-to-r from-vaultic-orange/15 to-vaultic-golden/10 border border-vaultic-orange/40 p-6 rounded-2xl text-center shadow-[0_0_30px_rgba(var(--accent-rgb),0.12)]">
                                                    <p className="text-xs text-vaultic-muted uppercase tracking-widest mb-2">Total Fixed Expenses</p>
                                                    <p className={`text-3xl font-black ${expenseDisplayClass}`}>₹{totalFixedExpenses.toLocaleString('en-IN')}</p>
                                                </div>

                                                <div className="flex gap-3 flex-col sm:flex-row">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (globalThis.window === undefined) return;
                                                            persistWizardData({
                                                                monthly_income: dna.monthly_income,
                                                                bank_balance: dna.bank_balance,
                                                                fixed_expenses: totalFixedExpenses,
                                                                target_savings_rate: dna.target_savings_rate,
                                                                savings_amount: dna.savings_amount,
                                                                primary_goal: dna.primary_goal,
                                                                goal_amount: dna.goal_amount,
                                                                expenses,
                                                            }, step);
                                                            router.push('/dashboard/graphs?wizardStep=2');
                                                        }}
                                                        className="vaultic-btn-primary w-fit inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-black uppercase tracking-[0.25em] transition"
                                                    >
                                                        Next Step
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="vaultic-stat-card rounded-[1.5rem] p-4 md:p-5 flex min-w-0 flex-col justify-between border-vaultic-orange/20 self-start">
                                                <div>
                                                    <p className="text-xs uppercase tracking-[0.35em] text-vaultic-muted mb-4">Expense guidance</p>
                                                    <p className="text-sm text-vaultic-slate leading-7">Recurring expenses feed Vaultic’s financial model so the system can align your safe budget and runway automatically.</p>
                                                </div>
                                                <div className="mt-8 rounded-3xl bg-vaultic-black/70 border border-vaultic-border p-6 text-center w-full">
                                                    <p className="text-[9px] uppercase tracking-[0.35em] text-vaultic-muted mb-3">Current fixed spend</p>
                                                    <p className={`text-xs md:text-lg font-black leading-tight ${expenseDisplayClass}`}>₹{totalFixedExpenses.toLocaleString('en-IN')}</p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {step === 3 && (
                                        <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: -20 }} className="space-y-6 px-4 py-6 md:p-8 text-vaultic-cream">
                                            <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-none text-center">Choose Your <br/><span className="text-vaultic-orange">Savings Goal.</span></h2>
                                            <div className="grid grid-cols-1 gap-3">
                                                {goals.map((g) => {
                                                    const p = computePrediction(g.id);
                                                    const isSelected = dna.primary_goal === g.id;
                                                    return (
                                                        <button
                                                            key={g.id}
                                                            type="button"
                                                            onClick={() => {
                                                                const updatedDna = { ...dna, primary_goal: g.id, goal_amount: String(p.target) };
                                                                setDna(updatedDna);
                                                                if (globalThis.window) {
                                                                    persistWizardData({
                                                                        monthly_income: updatedDna.monthly_income,
                                                                        bank_balance: updatedDna.bank_balance,
                                                                        fixed_expenses: totalFixedExpenses,
                                                                        target_savings_rate: updatedDna.target_savings_rate,
                                                                        savings_amount: updatedDna.savings_amount,
                                                                        primary_goal: updatedDna.primary_goal,
                                                                        goal_amount: updatedDna.goal_amount,
                                                                        expenses,
                                                                    }, 3);
                                                                }

                                                                // Persist selection to backend immediately (best-effort)
                                                                (async () => {
                                                                    try {
                                                                        const payload = {
                                                                            monthly_income: Number.parseFloat(updatedDna.monthly_income) || 0,
                                                                            fixed_expenses: totalFixedExpenses,
                                                                            bank_balance: Number.parseFloat(updatedDna.bank_balance) || 0,
                                                                            target_savings_rate: Number.parseFloat(updatedDna.target_savings_rate) || 0.3,
                                                                            savings_amount: Number.parseFloat(updatedDna.savings_amount) || 0,
                                                                            primary_goal: updatedDna.primary_goal,
                                                                            goal_amount: p.target,
                                                                            expenses,
                                                                        };
                                                                        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8001';
                                                                        const token = getAuthToken();
                                                                        await fetch(`${apiBase}/user/setup`, {
                                                                            method: 'POST',
                                                                            headers: {
                                                                                'Content-Type': 'application/json',
                                                                                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                                                                            },
                                                                            body: JSON.stringify(payload),
                                                                        });
                                                                    } catch (e) {
                                                                        console.error('Persisting goal failed', e);
                                                                    }
                                                                })();

                                                                router.push(g.route);
                                                            }}
                                                            className={`p-5 rounded-2xl border transition-all duration-200 flex items-center justify-between group ${isSelected ? 'bg-vaultic-orange border-vaultic-orange text-vaultic-ink shadow-[0_0_30px_rgba(var(--accent-rgb),0.35)]' : 'bg-vaultic-surface/70 border-vaultic-border text-vaultic-muted hover:bg-vaultic-surface hover:border-vaultic-orange hover:shadow-[0_0_20px_rgba(var(--accent-rgb),0.18)] active:scale-95'}`}>
                                                            <div className="flex items-center gap-4">
                                                                <g.icon size={24} className={isSelected ? 'text-vaultic-ink' : 'text-vaultic-cream'} />
                                                                <div className="flex flex-col text-left">
                                                                    <span className={`font-bold uppercase tracking-widest text-xs ${isSelected ? 'text-vaultic-ink' : 'text-vaultic-cream'}`}>{g.label}</span>
                                                                    <span className={`text-[11px] ${isSelected ? 'text-vaultic-ink/85' : 'text-vaultic-muted'}`}>Target: ₹{p.target.toLocaleString('en-IN')} • {p.years}y</span>
                                                                    <span className={`text-[11px] ${isSelected ? 'text-vaultic-ink/85' : 'text-vaultic-muted'}`}>Req: ₹{p.required_sip.toLocaleString('en-IN')}/mo</span>
                                                                </div>
                                                            </div>
                                                            <ArrowRight size={18} className={`transition-all duration-200 ${isSelected ? 'opacity-100 translate-x-0 text-vaultic-ink' : 'opacity-0 -translate-x-2 group-hover:opacity-60 group-hover:translate-x-0'}`} />
                                                        </button>
                                                    );
                                                })}
                                            </div>


                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>

                    <aside className="hidden xl:flex flex-col gap-4 rounded-[2.5rem] border border-vaultic-orange/20 bg-gradient-to-b from-vaultic-black/95 to-vaultic-surface/80 p-6 shadow-[0_0_60px_rgba(var(--accent-rgb),0.12)]">
                        <div className="space-y-4">
                            <div className="text-xs uppercase tracking-[0.35em] text-vaultic-orange">Monthly Finance</div>
                            <div className="vaultic-stat-card rounded-3xl p-5 border-vaultic-mint/20">
                                <p className="text-[10px] uppercase tracking-[0.35em] text-vaultic-mint mb-2">Monthly Income</p>
                                <p className={`text-3xl font-black ${incomeDisplayClass}`}>₹{incomeValue.toLocaleString('en-IN')}</p>
                            </div>
                            <div className="vaultic-stat-card rounded-3xl p-5 border-vaultic-error/20">
                                <p className="text-[10px] uppercase tracking-[0.35em] text-vaultic-error mb-2">Fixed Expenses</p>
                                <p className={`text-3xl font-black ${expenseDisplayClass}`}>₹{totalFixedExpenses.toLocaleString('en-IN')}</p>
                            </div>
                            <div className="vaultic-stat-card rounded-3xl p-5 border-vaultic-cyan/20">
                                <p className="text-[10px] uppercase tracking-[0.35em] text-vaultic-cyan mb-2">Projected Surplus</p>
                                <p className={`text-3xl font-black ${surplusDisplayClass}`}>₹{monthlySurplus.toLocaleString('en-IN')}</p>
                            </div>
                            <div className="vaultic-stat-card rounded-3xl p-5 border-vaultic-success/20">
                                <p className="text-[10px] uppercase tracking-[0.35em] text-vaultic-success mb-2">Savings Target</p>
                                <p className="text-3xl font-black text-vaultic-success">{savingsRatePercent}%</p>
                            </div>
                        </div>
                        <div className="mt-auto flex flex-col gap-3">
                            {step !== 2 && (
                                <button
                                    type="button"
                                    onClick={nextStep}
                                    disabled={
                                        (step === 1 && !dna.monthly_income) ||
                                        (step === 2 && expenses.length === 0)
                                    }
                                    className="vaultic-btn-primary w-full py-4 rounded-2xl text-xs uppercase tracking-widest disabled:opacity-20 disabled:cursor-not-allowed"
                                >
                                    {step === 1 ? 'Next' : 'Finish & Dashboard'} <ArrowRight size={16} />
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setStep((prev) => Math.max(prev - 1, 1))}
                                disabled={step === 1}
                                className="vaultic-btn-secondary w-full py-4 rounded-2xl text-xs uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                Back
                            </button>
                        </div>
                    </aside>
                </div>
            </motion.div>
        </div>
    );
}
