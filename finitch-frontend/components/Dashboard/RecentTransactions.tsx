"use client";
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CreditCard, ArrowDownRight } from 'lucide-react';

interface Transaction {
    id: number;
    merchant: string;
    amount: number;
    category: string;
    timestamp: string;
}

interface RecentTransactionsProps {
    transactions?: Transaction[];
}

export default function RecentTransactions({ transactions }: RecentTransactionsProps) {
    if (!transactions || transactions.length === 0) {
        return null;
    }

    return (
        <div className="vaultic-panel rounded-3xl p-8 mb-10">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-vaultic-orange/10 border border-vaultic-orange/20 rounded-xl flex items-center justify-center text-vaultic-orange">
                        <CreditCard size={18} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black uppercase tracking-tight italic text-vaultic-cream">Recent Transactions</h3>
                        <p className="text-[10px] text-vaultic-muted">Latest spending across all accounts</p>
                    </div>
                </div>
                <Link href="/dashboard/audit" className="text-[10px] font-bold uppercase tracking-widest text-vaultic-orange hover:text-vaultic-orange transition-colors">View All →</Link>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                {transactions.slice(0, 8).map((tx, idx) => (
                    <motion.div
                        key={`${tx.id}-${tx.timestamp}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="flex items-center justify-between p-4 bg-vaultic-surface/40 hover:bg-vaultic-surface/70 border border-vaultic-border rounded-xl transition-all group"
                    >
                        <div className="flex items-center gap-4 flex-1">
                            <div className="w-10 h-10 bg-vaultic-orange/10 rounded-lg flex items-center justify-center group-hover:bg-vaultic-orange/20 transition">
                                <ArrowDownRight size={16} className="text-vaultic-orange" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-vaultic-cream group-hover:text-vaultic-orange transition">{tx.merchant}</p>
                                <p className="text-[10px] text-vaultic-muted">{tx.category}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-black text-vaultic-cream">-₹{tx.amount.toLocaleString('en-IN')}</p>
                            <p className="text-[9px] text-vaultic-muted">{new Date(tx.timestamp).toLocaleDateString()}</p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}