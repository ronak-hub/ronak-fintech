"use client";
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Target } from 'lucide-react';

interface Goal {
    id: number;
    goal_name: string;
    target_amount: number;
    years: number;
    required_sip: number;
}

interface ActiveGoalsProps {
    goals?: Goal[];
}

export default function ActiveGoals({ goals }: ActiveGoalsProps) {
    if (!goals || goals.length === 0) {
        return null;
    }

    return (
        <div className="vaultic-panel rounded-3xl p-8 mb-10">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-vaultic-mint/10 border border-vaultic-mint/20 rounded-xl flex items-center justify-center text-vaultic-mint">
                        <Target size={18} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black uppercase tracking-tight italic text-vaultic-cream">Your Goals</h3>
                        <p className="text-[10px] text-vaultic-muted">Active milestones and targets</p>
                    </div>
                </div>
                <Link href="/dashboard/core" className="text-[10px] font-bold uppercase tracking-widest text-vaultic-mint hover:text-vaultic-mint/80 transition-colors">Manage →</Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {goals.map((goal, idx) => (
                    <motion.div
                        key={`goal-${goal.id}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="min-w-0 bg-vaultic-surface/40 border border-vaultic-border rounded-2xl p-6 hover:border-vaultic-mint/20 transition-all group"
                    >
                        <h4 className="break-words font-bold text-vaultic-cream group-hover:text-vaultic-mint transition mb-3">{goal.goal_name}</h4>
                        <div className="space-y-3">
                            <div className="min-w-0 flex justify-between text-sm">
                                <span className="text-vaultic-muted break-words">Target Amount</span>
                                <span className="min-w-0 break-words font-bold text-vaultic-cream">₹{goal.target_amount.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="min-w-0 flex justify-between text-sm">
                                <span className="text-vaultic-muted break-words">Timeframe</span>
                                <span className="min-w-0 break-words font-bold text-vaultic-cream">{goal.years} year{goal.years === 1 ? '' : 's'}</span>
                            </div>
                            <div className="min-w-0 flex justify-between text-sm">
                                <span className="text-vaultic-muted break-words">Monthly SIP</span>
                                <span className="min-w-0 break-words font-bold text-vaultic-mint">₹{goal.required_sip.toLocaleString('en-IN')}</span>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}