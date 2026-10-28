"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  LineChart,
  ShieldCheck,
  // Sparkles replaced with ArrowRight per design request
  Target,
  TrendingUp,
  WalletCards,
  Zap,
} from "lucide-react";
import { LeakSignals } from "@/components/landing/LeakSignals";
import { RealityCheck } from "@/components/landing/RealityCheck";
import { ContactSection } from "@/components/landing/ContactSection";

// FloatingCard removed — static preview/3D canvas omitted

const RunwayLineChart = dynamic(() => import("@/components/landing/RunwayLineChart"), {
  ssr: false,
  loading: () => <div className="h-[320px] animate-pulse rounded-[2rem] bg-white/5 sm:h-[380px]" />,
});

const CategoryBarChart = dynamic(() => import("@/components/landing/CategoryBarChart"), {
  ssr: false,
  loading: () => <div className="h-[220px] animate-pulse rounded-[1.5rem] bg-white/5" />,
});

const BreakdownPie = dynamic(() => import("@/components/landing/BreakdownPie"), {
  ssr: false,
  loading: () => <div className="h-[320px] animate-pulse rounded-[2rem] bg-white/5 sm:h-[380px]" />,
});

const insightTicker = [
  "Runway clarity beats reactive budgeting.",
  "Every nudge is tied to a goal you actually care about.",
  "See leaks before they become lifestyle drift.",
  "Plan freedom with numbers, not guesswork.",
];

const featureCards = [
  {
    title: "Unified cash pulse",
    description: "Income, outflow, and runway in one live view — no spreadsheet archaeology required.",
    icon: WalletCards,
  },
  {
    title: "Leak detection",
    description: "Subscriptions, impulse spend, and category drift surfaced with clear, actionable alerts.",
    icon: ShieldCheck,
  },
  {
    title: "Goal trajectory",
    description: "Model savings boosts and spending changes to see exactly when you hit each milestone.",
    icon: Target,
  },
  {
    title: "Freedom forecasting",
    description: "Simulate scenarios and understand how today's choices move your independence date.",
    icon: TrendingUp,
  },
];

const planCards = [
  {
    title: "Starter",
    price: "Free",
    subtitle: "For individuals getting clarity on cash flow.",
    features: ["Weekly financial pulse", "Basic goal tracking", "Leak alerts"],
    buttonText: "Open Vaultic",
    href: "/login",
  },
  {
    title: "Signal",
    price: "₹999/mo",
    subtitle: "For builders who want deeper runway intelligence.",
    features: ["Real-time runway insights", "Scenario planning", "Priority support"],
    buttonText: "Start free trial",
    href: "/login",
    popular: true,
    trial: "14-day free trial",
  },
  {
    title: "Scale",
    price: "Custom",
    subtitle: "For teams managing shared financial strategy.",
    features: ["Advanced forecasting", "Team access", "Private strategy workspace"],
    buttonText: "Coming soon",
    disabled: true,
  },
];

const faqs = [
  {
    question: "What is Vaultic?",
    answer:
      "Vaultic is a decision-intelligence app for personal finance. It turns transactions, goals, and spending patterns into clear signals so you can act with confidence.",
  },
  {
    question: "Do I need to connect my bank on day one?",
    answer:
      "No. You can start with manual entries and monthly summaries. Bank sync via RBI Account Aggregator is available when you are ready.",
  },
  {
    question: "How is this different from a budgeting app?",
    answer:
      "Most budgeting apps track what already happened. Vaultic focuses on what happens next — runway, goal impact, and the cost of everyday decisions.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Yes. Vaultic uses RBI AA-compliant data flows where applicable, and never stores your bank passwords.",
  },
  {
    question: "Can I use Vaultic for long-term planning?",
    answer:
      "Absolutely. Freedom forecasting, goal timelines, and scenario sliders are built for multi-year planning — not just monthly reviews.",
  },
];

export default function LandingPage() {
  type PlanCard = (typeof planCards)[number];

  const renderPlanButton = (plan: PlanCard) => {
    if (plan.disabled) {
      return (
        <button
          disabled
          className="mt-8 w-full rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/40"
        >
          {plan.buttonText}
        </button>
      );
    }

    const buttonClass = plan.popular
      ? "mt-8 flex w-full items-center justify-center rounded-full bg-vaultic-orange px-5 py-3 text-sm font-bold text-black shadow-[0_20px_50px_rgba(245,158,11,0.35)] transition hover:brightness-105"
      : "mt-8 flex w-full items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-bold text-black transition hover:brightness-105";

    return (
      <Link href={plan.href ?? "/login"} className={buttonClass}>
        {plan.buttonText}
      </Link>
    );
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-vaultic-black pt-20 text-vaultic-cream">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-24 top-0 h-[520px] w-[520px] rounded-full bg-vaultic-orange/8 blur-[120px]" />
        <div className="absolute -right-24 top-32 h-[480px] w-[480px] rounded-full bg-vaultic-cyan/8 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-vaultic-mint/6 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-10 lg:px-12">
        {/* Hero */}
        <section id="home" className="flex min-h-[calc(100vh-5rem)] flex-col justify-center py-16 lg:py-24">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-8"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-vaultic-orange/25 bg-vaultic-orange/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.35em] text-vaultic-orange">
                <Zap size={14} fill="currentColor" />
                Decision intelligence for money
              </div>

              <div className="space-y-5">
                <p className="text-sm uppercase tracking-[0.4em] text-vaultic-cyan/70">Clarity, runway, freedom</p>
                <h1 className="max-w-4xl text-5xl break-words font-black leading-tight tracking-[-0.04em] sm:text-6xl lg:text-7xl">
                  Your finances, <span className="block sm:inline-block gradient-text">reimagined.</span>
                </h1>
                <p className="max-w-xl text-base leading-8 text-white/70 sm:text-lg">
                  Vaultic turns messy transactions and goals into a sharp set of signals — so every spending decision moves you closer to the life you are building.
                </p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-bold text-black shadow-[0_20px_60px_rgba(255,255,255,0.14)] transition hover:brightness-105"
                >
                  Get started <ArrowRight size={16} />
                </Link>
                <Link
                  href="#demo"
                  className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-8 py-4 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Try the demo
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { value: "24/7", label: "Financial pulse" },
                  { value: "18 mo", label: "Avg. runway view" },
                  { value: "92%", label: "Clarity score" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-3xl border border-white/10 bg-white/[0.04] px-5 py-4 text-center">
                    <p className="text-2xl font-black text-white">{stat.value}</p>
                    <p className="text-sm text-white/55">{stat.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="space-y-5"
            >
              <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#0b0f16] p-4 shadow-[0_50px_100px_rgba(0,0,0,0.4)]">
                <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/10 to-transparent" />
                <div className="h-[280px] sm:h-[320px]">
                  <RunwayLineChart />
                </div>
              </div>
              <CategoryBarChart />
            </motion.div>
          </div>
        </section>

        {/* Ticker */}
        <div className="overflow-hidden border-y border-white/10 py-6">
          <motion.div
            animate={{ x: [0, -1200] }}
            transition={{ repeat: Infinity, duration: 32, ease: "linear" }}
            className="flex gap-16 whitespace-nowrap pr-16"
          >
            {[...insightTicker, ...insightTicker].map((line, index) => (
              <span key={`${line}-${index}`} className="flex items-center gap-4 text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
                <span className="h-1.5 w-1.5 rounded-full bg-vaultic-mint shadow-[0_0_10px_#2DD4A4]" />
                {line}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Leak signals */}
        <section id="features">
          <LeakSignals />

          <div className="py-16">
            <div className="space-y-4 text-center">
              <p className="text-sm uppercase tracking-[0.4em] text-vaultic-cyan/70">Built for confident decisions</p>
              <h2 className="text-3xl font-black sm:text-5xl">
                One platform for <span className="block text-vaultic-orange">your entire money story.</span>
              </h2>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {featureCards.map((card, index) => {
                const Icon = card.icon;
                return (
                  <motion.div
                    key={card.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.06 }}
                    className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.25)] transition hover:border-vaultic-orange/25"
                  >
                    <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-vaultic-orange/10 text-vaultic-orange">
                      <Icon size={22} />
                    </div>
                    <h3 className="text-xl font-bold text-white">{card.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-white/65">{card.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Demo */}
        <section id="demo">
          <RealityCheck />

          <div className="grid gap-8 py-16 lg:grid-cols-[1fr_1.1fr] lg:items-center">
            <div className="space-y-5">
              <p className="text-sm uppercase tracking-[0.4em] text-vaultic-cyan/70">Dynamic wealth visualization</p>
              <h2 className="text-3xl font-black sm:text-4xl">
                See your trajectory, <span className="block text-vaultic-cyan">not just your balance.</span>
              </h2>
              <p className="text-base leading-8 text-white/65">
                Clean, responsive charts translate cash flow into movement you can act on — growth, trend, and category balance in one view.
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70">
                  <BarChart3 size={18} className="text-vaultic-cyan" />
                  Live category bars
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70">
                  <LineChart size={18} className="text-vaultic-mint" />
                  Runway projection
                </div>
              </div>
            </div>
            <BreakdownPie />
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-20">
          <div className="space-y-4 text-center">
            <p className="text-sm uppercase tracking-[0.4em] text-vaultic-cyan/70">Pricing</p>
            <h2 className="text-3xl font-black sm:text-5xl">Start free. Scale when you are ready.</h2>
            <p className="mx-auto max-w-2xl text-sm text-white/60">Choose a plan that fits your cashflow rhythm — free forever for basics, trial for deep runway intelligence.</p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {planCards.map((plan) => (
              <div
                key={plan.title}
                className={`relative overflow-hidden rounded-[2rem] border bg-white/[0.04] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.18)] backdrop-blur ${
                  plan.popular ? "border-vaultic-orange/40 bg-vaultic-orange/5 shadow-[0_40px_100px_rgba(245,158,11,0.14)]" : "border-white/10"
                }`}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-xl font-bold text-white">{plan.title}</h3>
                  {plan.popular && (
                    <span className="rounded-full bg-vaultic-orange px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] text-black shadow-sm shadow-vaultic-orange/20">
                      Most popular
                    </span>
                  )}
                </div>
                <p className="text-4xl font-black text-white">{plan.price}</p>
                {plan.trial && !plan.disabled && (
                  <p className="mt-2 inline-flex rounded-full bg-vaultic-cyan/10 px-3 py-1 text-sm font-semibold text-vaultic-cyan">{plan.trial}</p>
                )}
                {plan.price === 'Free' && (
                  <p className="mt-2 inline-flex rounded-full bg-vaultic-mint/10 px-3 py-1 text-sm font-semibold text-vaultic-mint">Always free</p>
                )}
                <p className="mt-3 text-sm text-white/60">{plan.subtitle}</p>
                <div className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-3 text-sm text-white/70">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-vaultic-cyan/10 text-vaultic-cyan">✓</span>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                {renderPlanButton(plan)}
                {plan.trial && !plan.disabled && (
                  <p className="mt-3 text-xs text-white/60">No charge for {plan.trial} — cancel anytime.</p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-20">
          <div className="space-y-4 text-center">
            <p className="text-sm uppercase tracking-[0.4em] text-vaultic-cyan/70">FAQ</p>
            <h2 className="text-3xl font-black sm:text-5xl">Questions, answered.</h2>
          </div>

          <div className="mt-12 space-y-4">
            {faqs.map((faq) => (
              <details key={faq.question} className="group rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6">
                <summary className="cursor-pointer list-none text-lg font-semibold text-white marker:content-none">
                  <span className="flex items-center justify-between gap-4">
                    {faq.question}
                    <ArrowRight size={16} className="shrink-0 text-vaultic-orange opacity-60 transition group-open:rotate-90" />
                  </span>
                </summary>
                <p className="mt-4 text-sm leading-7 text-white/65">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Contact */}
        <ContactSection />

        {/* CTA removed — pricing section now carries trial microcopy and CTAs */}
      </div>

      <footer className="relative z-10 border-t border-white/10 py-10 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-white/35">
          Vaultic · Decision intelligence engine © {new Date().getFullYear()}
        </p>
      </footer>
    </main>
  );
}
