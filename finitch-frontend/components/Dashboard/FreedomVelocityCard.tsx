"use client";
import { motion } from 'framer-motion';

interface FreedomData {
    exit_date?: string;
    years_remaining?: number;
}

interface WealthLeaks {
    daily_lazy_cash_loss?: number;
}

interface FreedomVelocityCardProps {
    healthScore?: number;
    freedomData?: FreedomData;
    wealthLeaks?: WealthLeaks;
}

export default function FreedomVelocityCard({ healthScore = 0, freedomData, wealthLeaks }: FreedomVelocityCardProps) {
    return (
        <div className="vaultic-panel lg:col-span-5 min-w-0 p-7 sm:p-10 xl:p-12 rounded-3xl flex flex-col justify-between">
            <div>
                <h3 className="text-4xl font-black tracking-tighter uppercase italic text-vaultic-cream">Freedom <br /> Velocity</h3>
                <p className="text-sm text-vaultic-muted leading-relaxed max-w-md mt-4">
                    This gauge represents how fast Vaultic is pushing you toward financial independence. Higher velocity means the system is accelerating your exit trajectory and reducing time spent in the drain zone.
                </p>
            </div>

            <div className="mt-10 space-y-6">
                <div className="h-3 w-full bg-vaultic-surface/70 rounded-full overflow-hidden border border-vaultic-border">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${healthScore}%` }} className="h-full bg-vaultic-mint" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-vaultic-black/60 p-4 rounded-3xl border border-vaultic-border">
                        <p className="text-[9px] uppercase tracking-[0.28em] text-vaultic-muted">Projected Exit</p>
                        <p className="text-lg font-black text-vaultic-cream mt-2">{freedomData?.exit_date || 'CALIBRATING'}</p>
                    </div>
                    <div className="bg-vaultic-black/60 p-4 rounded-3xl border border-vaultic-border">
                        <p className="text-[9px] uppercase tracking-[0.28em] text-vaultic-muted">Years Remaining</p>
                        <p className="text-lg font-black text-vaultic-cream mt-2">{freedomData?.years_remaining ?? '—'}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-vaultic-black/60 p-4 rounded-3xl border border-vaultic-border">
                        <p className="text-[9px] uppercase tracking-[0.28em] text-vaultic-muted">Velocity Score</p>
                        <p className="text-lg font-black text-vaultic-mint mt-2">{healthScore}%</p>
                    </div>
                    <div className="bg-vaultic-black/60 p-4 rounded-3xl border border-vaultic-border">
                        <p className="text-[9px] uppercase tracking-[0.28em] text-vaultic-muted">Momentum</p>
                        <p className="text-lg font-black text-vaultic-cream mt-2">{wealthLeaks?.daily_lazy_cash_loss ? 'At Risk' : 'Steady'}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}