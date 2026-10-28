"use client";

import { ChangeEvent, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export const RealityCheck = () => {
  const [spend, setSpend] = useState(0);
  const delayDays = Math.floor(spend / 42);
  const feasibility = Math.max(10, 95 - Math.floor(spend / 100));

  return (
    <section className="py-20">
      <div className="grid grid-cols-1 gap-10 rounded-[2.5rem] border border-white/10 bg-white/[0.03] p-8 md:grid-cols-2 md:p-12 lg:p-14">
        <div className="space-y-6">
          <p className="text-sm uppercase tracking-[0.4em] text-vaultic-cyan/70">Interactive demo</p>
          <h3 className="text-3xl font-black tracking-tight sm:text-4xl">
            See how one purchase
            <span className="block text-vaultic-orange">shifts your timeline.</span>
          </h3>
          <p className="text-base leading-8 text-white/65">
            Drag the slider to simulate a splurge. Vaultic projects how it affects your savings goal and runway — before you swipe.
          </p>

          <div className="space-y-4 pt-4">
            <div className="flex items-end justify-between">
              <label htmlFor="spendRange" className="text-xs font-bold uppercase tracking-[0.3em] text-vaultic-orange">
                Simulated purchase
              </label>
              <span className="text-2xl font-black text-white">₹{spend.toLocaleString("en-IN")}</span>
            </div>
            <div className="relative flex h-6 items-center">
              <div className="absolute h-1.5 w-full rounded-full bg-white/10" />
              <input
                id="spendRange"
                type="range"
                min="0"
                max="10000"
                step="500"
                value={spend}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSpend(Number.parseInt(e.target.value, 10))}
                className="absolute z-10 h-1.5 w-full cursor-pointer appearance-none bg-transparent"
              />
              <div
                className="pointer-events-none absolute h-1.5 rounded-full bg-vaultic-orange"
                style={{ width: `${(spend / 10000) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center rounded-[2rem] border border-white/10 bg-black/40 p-8">
          <div className="mb-6 flex items-center justify-between">
            <h4 className="text-lg font-bold text-white">Europe trip fund</h4>
            <span className="rounded-full bg-vaultic-mint/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] text-vaultic-mint">
              {feasibility}% feasible
            </span>
          </div>

          <div className="h-3 w-full overflow-hidden rounded-full bg-white/5">
            <motion.div
              className="h-full rounded-full bg-vaultic-cyan"
              initial={{ width: "95%" }}
              animate={{ width: `${feasibility}%` }}
              transition={{ duration: 0.4, ease: "circOut" }}
            />
          </div>

          <div className="mt-6 min-h-[56px]">
            <AnimatePresence mode="wait">
              {spend > 0 ? (
                <motion.p
                  key="spend-message"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="text-sm leading-7 text-vaultic-orange"
                >
                  This purchase could delay your trip by <strong className="text-white">{delayDays} days</strong> and reduce projected returns at your current savings rate.
                </motion.p>
              ) : (
                <motion.p
                  key="initial-message"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm leading-7 text-white/55"
                >
                  Move the slider to preview how everyday decisions compound against your goals.
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
};
