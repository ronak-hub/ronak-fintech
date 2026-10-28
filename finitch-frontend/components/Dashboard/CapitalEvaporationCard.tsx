"use client";

interface CapitalEvaporationCardProps {
    dailyLoss?: number;
    onPlugLeak: () => void;
}

export default function CapitalEvaporationCard({ dailyLoss = 0, onPlugLeak }: CapitalEvaporationCardProps) {
    return (
        <div className="lg:col-span-7 min-w-0 bg-gradient-to-br from-vaultic-orange via-vaultic-golden to-vaultic-rose p-7 sm:p-10 xl:p-12 rounded-3xl text-vaultic-ink relative overflow-hidden group shadow-2xl">
            <div className="relative z-10 max-w-2xl">
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-vaultic-ink/70">Cash drift signal</p>
                <h3 className="text-4xl sm:text-5xl xl:text-6xl font-black tracking-tighter uppercase italic leading-[0.86] mt-4">Capital <br /> Evaporation.</h3>
                <p className="mt-6 text-base sm:text-lg font-semibold leading-7 text-vaultic-ink/90">
                    This shows the quiet money leakage that happens when cash sits idle, fees stack up, or spending drifts without a clear rule. A small leak compounds over time and can delay your freedom date by months.
                </p>
                <div className="mt-8 grid gap-4 sm:grid-cols-[1fr_auto] rounded-2xl border border-vaultic-ink/15 bg-vaultic-cream/70 p-5 backdrop-blur">
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-vaultic-ink/70">Estimated daily leak</p>
                        <p className="mt-2 text-3xl font-black text-vaultic-ink">₹{dailyLoss.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="flex items-center justify-center rounded-2xl bg-vaultic-ink px-4 py-3 text-vaultic-cream text-sm font-black uppercase tracking-[0.2em]">
                        Fix it fast
                    </div>
                </div>
                <button onClick={onPlugLeak} className="mt-8 bg-vaultic-cream text-vaultic-ink px-8 sm:px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-vaultic-ink hover:text-vaultic-cream transition-all relative z-10">Investigate leak</button>
            </div>
        </div>
    );
}