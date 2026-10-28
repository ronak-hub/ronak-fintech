"use client";
import { DollarSign, TrendingDown, Wallet, Target } from 'lucide-react';

interface UserProfile {
    monthly_income?: number;
    rent?: number;
    emis?: number;
    insurance?: number;
    fixed_expenses?: number;
    current_bank_balance?: number;
    target_savings_rate?: number;
}

interface FinancialProfileProps {
    userProfile?: UserProfile;
}

export default function FinancialProfile({ userProfile }: FinancialProfileProps) {
    const totalFixedExpenses = userProfile?.fixed_expenses ?? ((userProfile?.rent || 0) + (userProfile?.emis || 0) + (userProfile?.insurance || 0));

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 items-stretch auto-rows-fr">
            <div className="vaultic-panel p-6 rounded-2xl h-full flex flex-col justify-between min-w-0">
                <div className="min-w-0 flex items-center justify-between mb-4">
                    <div className="break-words text-[9px] font-mono uppercase font-black tracking-widest text-vaultic-muted">Monthly Income</div>
                    <DollarSign size={16} className="text-vaultic-orange" />
                </div>
                <p className="whitespace-nowrap text-3xl font-black text-vaultic-cream">₹{(userProfile?.monthly_income || 0).toLocaleString('en-IN')}</p>
                <p className="break-words text-[10px] text-vaultic-muted mt-2">Gross Income</p>
            </div>

            <div className="vaultic-panel p-6 rounded-2xl h-full flex flex-col justify-between min-w-0">
                <div className="min-w-0 flex items-center justify-between mb-4">
                    <div className="break-words text-[9px] font-mono uppercase font-black tracking-widest text-vaultic-muted">Fixed Expenses</div>
                    <TrendingDown size={16} className="text-vaultic-orange" />
                </div>
                <p className="whitespace-nowrap text-3xl font-black text-vaultic-cream">₹{totalFixedExpenses.toLocaleString('en-IN')}</p>
                <p className="break-words text-[10px] text-vaultic-muted mt-2">Rent + EMI + Insurance</p>
            </div>

            <div className="vaultic-panel p-6 rounded-2xl h-full flex flex-col justify-between min-w-0">
                <div className="min-w-0 flex items-center justify-between mb-4">
                    <div className="break-words text-[9px] font-mono uppercase font-black tracking-widest text-vaultic-muted">Bank Balance</div>
                    <Wallet size={16} className="text-vaultic-mint" />
                </div>
                <p className="whitespace-nowrap text-3xl font-black text-vaultic-cream">₹{(userProfile?.current_bank_balance || 0).toLocaleString('en-IN')}</p>
                <p className="break-words text-[10px] text-vaultic-muted mt-2">Current Liquid</p>
            </div>

            <div className="vaultic-panel p-6 rounded-2xl h-full flex flex-col justify-between min-w-0">
                <div className="min-w-0 flex items-center justify-between mb-4">
                    <div className="break-words text-[9px] font-mono uppercase font-black tracking-widest text-vaultic-muted">Savings Target</div>
                    <Target size={16} className="text-vaultic-mint" />
                </div>
                <p className="whitespace-nowrap text-3xl font-black text-vaultic-cream">{Math.round((userProfile?.target_savings_rate || 0) * 100)}%</p>
                <p className="break-words text-[10px] text-vaultic-muted mt-2">Monthly Allocation</p>
            </div>
        </div>
    );
}