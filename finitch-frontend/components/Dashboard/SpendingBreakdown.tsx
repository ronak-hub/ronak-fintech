"use client";
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';

interface SpendingBreakdownProps {
    spendingByCategory?: { [key: string]: number };
}

export default function SpendingBreakdown({ spendingByCategory }: SpendingBreakdownProps) {
    if (!spendingByCategory || Object.keys(spendingByCategory).length === 0) {
        return null;
    }

    return (
        <div className="vaultic-panel rounded-3xl p-8 mb-10">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-vaultic-cyan/10 border border-vaultic-cyan/20 rounded-xl flex items-center justify-center text-vaultic-cyan">
                    <Activity size={18} />
                </div>
                <div>
                    <h3 className="text-lg font-black uppercase tracking-tight italic text-vaultic-cream">Spending Breakdown</h3>
                    <p className="text-[10px] text-vaultic-muted">By category analysis</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(spendingByCategory).map(([category, amount], idx) => (
                    <motion.div
                        key={`category-${category}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="min-w-0 flex items-center justify-between p-4 bg-vaultic-surface/40 border border-vaultic-border rounded-xl hover:bg-vaultic-surface/70 transition"
                    >
                        <span className="max-w-[60%] break-words font-bold text-vaultic-cream text-sm">{category}</span>
                        <span className="min-w-0 break-words font-black text-vaultic-orange text-sm">₹{typeof amount === 'number' ? amount.toLocaleString('en-IN') : '0'}</span>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}