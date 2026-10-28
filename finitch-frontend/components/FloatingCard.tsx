"use client";

export default function FloatingCard() {
  // Simple static preview card — canvas/3D removed due to rendering issues.
  return (
    <div className="h-full w-full">
      <div className="relative overflow-hidden rounded-[2.5rem] border border-white/6 bg-gradient-to-br from-[#0b0f16] to-[#071018] p-6 shadow-[0_40px_80px_rgba(0,0,0,0.5)] h-full">
        <div className="absolute -left-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br from-vaultic-orange/20 to-vaultic-cyan/10 blur-2xl opacity-30" />

        <div className="flex h-full w-full items-center justify-center">
          <div className="rounded-2xl bg-[#0b1116] p-6 shadow-inner w-full max-w-3xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-md bg-[conic-gradient(at_top_left,#f59e0b,_#2dd4a4)] flex items-center justify-center text-black font-bold"> </div>
                <div>
                  <div className="text-sm font-semibold text-white">Vaultic preview</div>
                  <div className="text-xs text-white/60">Interactive demo</div>
                </div>
              </div>
              <div className="text-xs text-white/50">Live • sample data</div>
            </div>

            <div className="mt-6">
              <div className="flex items-center gap-3">
                <button className="rounded-full bg-vaultic-cyan/10 px-3 py-1 text-sm text-vaultic-cyan hover:bg-vaultic-cyan/20">+ Income</button>
                <button className="rounded-full bg-vaultic-orange/10 px-3 py-1 text-sm text-vaultic-orange hover:bg-vaultic-orange/20">Simulate drop</button>
                <button className="rounded-full bg-white/5 px-3 py-1 text-sm text-white/80 hover:bg-white/10">Show projection</button>
                <div className="ml-auto text-sm text-white/60">Balance: <span className="font-bold text-white">₹7.4k</span></div>
              </div>

              <div className="mt-4 h-24 w-full rounded-md bg-gradient-to-b from-white/6 to-transparent" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}