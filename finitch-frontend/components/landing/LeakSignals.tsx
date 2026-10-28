"use client";

import { motion } from "framer-motion";

const leakSignals = [
  {
    title: "Subscription creep",
    detail: "Three streaming services renewed on the same day.",
    impact: "+ ₹1,200 / mo",
    accent: "border-vaultic-orange/40",
  },
  {
    title: "Impulse velocity",
    detail: "Late-night food orders are up 38% this month.",
    impact: "+ ₹450 / order",
    accent: "border-vaultic-cyan/40",
  },
  {
    title: "Runway pressure",
    detail: "Spending pace leaves only 5 days of buffer.",
    impact: "Critical",
    accent: "border-vaultic-rose/40",
  },
];

export const LeakSignals = () => {
  return (
    <section className="py-20">
      <div className="space-y-4 text-center">
        <p className="text-sm uppercase tracking-[0.4em] text-vaultic-cyan/70">Where money quietly leaks</p>
        <h2 className="text-3xl font-black sm:text-5xl">
          Catch friction before it
          <span className="block text-vaultic-orange">erodes your goals.</span>
        </h2>
        <p className="mx-auto max-w-2xl text-base leading-8 text-white/65">
          Vaultic surfaces the patterns spreadsheets miss — subscriptions, impulse spend, and runway drift — in plain language.
        </p>
      </div>

      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {leakSignals.map((signal, index) => (
          <motion.article
            key={signal.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ delay: index * 0.08 }}
            className={`rounded-[2rem] border bg-white/[0.03] p-8 text-left shadow-[0_24px_60px_rgba(0,0,0,0.28)] ${signal.accent}`}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-white/45">{signal.title}</p>
            <p className="mt-4 text-sm leading-7 text-white/70">{signal.detail}</p>
            <p className="mt-6 text-2xl font-black text-white">{signal.impact}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
};
