"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Pizza, Share2, Target, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

// Data simulation for the "Story"
const wrappedStory = {
    persona: "Impulse Warrior",
    vibe_icon: <Zap className="text-vaultic-orange" size={80} />,
    big_leak_cat: "Food Delivery",
    big_leak_icon: <Pizza className="text-vaultic-cyan" size={60} />,
    big_leak_amount: 14500,
    leak_impact: "3 weekends in Goa",
    freedom_date: "August 2042",
    freedom_countdown: "16 Years, 4 Months",
    score: 85
};

export default function FinovaWrapped() {
    const [slide, setSlide] = useState(1);
    const totalSlides = 3;

    useEffect(() => {
        if (slide <= totalSlides) {
            const timer = setTimeout(() => setSlide(slide + 1), 6000);
            return () => clearInterval(timer);
        }
    }, [slide]);

    const slideVariants = {
        initial: { opacity: 0, x: 200 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -200 },
    };

    return (
        <div className="vaultic-page text-vaultic-cream p-4 sm:p-8 lg:p-12 font-sans selection:bg-vaultic-orange/30 relative overflow-hidden">
            <div className="absolute inset-0 z-0 pointer-events-none bg-[linear-gradient(135deg,_rgba(var(--accent-rgb),0.14),transparent_35%,rgba(var(--cyan-rgb),0.10)_100%)]" />

            {/* HEADER / NAV */}
            <nav className="relative z-50 border-b border-vaultic-border bg-vaultic-black/60 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-10 py-5 flex justify-between items-center">
                    <Link href="/dashboard" className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-vaultic-orange rounded-lg flex items-center justify-center font-black text-vaultic-ink shadow-[0_0_20px_rgba(var(--accent-rgb),0.3)]">F</div>
                        <span className="text-xl font-bold tracking-tighter text-vaultic-cream uppercase italic">Finova Wrapped</span>
                    </Link>
                    <div className="flex gap-1 items-center">
                        {Array.from({ length: totalSlides }, (_, idx) => idx + 1).map((slideNumber) => (
                            <div key={`wrapped-dot-${slideNumber}`} className={`h-1 w-12 rounded-full transition-all duration-300 ${slideNumber === slide ? 'bg-vaultic-orange' : 'bg-vaultic-surface/40'}`} />
                        ))}
                    </div>
                    <button className="flex items-center gap-2 px-6 py-2 bg-vaultic-surface/70 border border-vaultic-border text-vaultic-muted rounded-full font-black text-[10px] hover:bg-vaultic-orange hover:text-vaultic-ink transition-all shadow-xl shadow-black/20 uppercase tracking-widest">
                        <Share2 size={12} /> Share My Story
                    </button>
                </div>
            </nav>

            {/* MAIN CAROUSEL */}
            <main className="relative z-10 flex items-center justify-center h-[calc(100vh-100px)] mt-24">
                <AnimatePresence mode="wait">
                    {slide === 1 && (
                        <motion.div key="s1" variants={slideVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.5 }}
                            className="text-center space-y-12"
                        >
                            <motion.div animate={{ rotate: [0, 360, 0] }} transition={{ repeat: Infinity, duration: 10, ease: "linear" }} className="w-40 h-40 bg-vaultic-surface/70 rounded-full flex items-center justify-center border border-vaultic-border mx-auto p-6 shadow-2xl">
                                {wrappedStory.vibe_icon}
                            </motion.div>
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-vaultic-orange italic">2026 Spending DNA</h4>
                                <h2 className="text-9xl font-black tracking-tighter uppercase italic leading-[0.8] text-vaultic-cream">The <br/> {wrappedStory.persona}.</h2>
                                <p className="text-vaultic-muted text-xl font-medium max-w-sm mx-auto leading-relaxed italic">You are a master of late-night impulse UPIs. Your wallet feels the burn.</p>
                            </div>
                        </motion.div>
                    )}

                    {slide === 2 && (
                        <motion.div key="s2" variants={slideVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.5 }}
                            className="text-center space-y-12"
                        >
                            <div className="w-40 h-40 bg-vaultic-cyan/10 rounded-full flex items-center justify-center border border-vaultic-cyan/30 mx-auto shadow-xl shadow-vaultic-cyan/5">
                                {wrappedStory.big_leak_icon}
                            </div>
                            <div className="space-y-6">
                                <h2 className="text-8xl font-black tracking-tighter uppercase italic text-vaultic-cream leading-[0.9]">The <br/><span className="text-vaultic-cyan">Big Leak.</span></h2>
                                <p className="text-vaultic-muted text-xl font-medium max-w-lg mx-auto leading-relaxed italic">
                                    You spent ₹{wrappedStory.big_leak_amount.toLocaleString()} on {wrappedStory.big_leak_cat}. That’s effectively <span className="text-vaultic-cream font-bold decoration-2 decoration-vaultic-cyan underline">{wrappedStory.leak_impact}</span>.
                                </p>
                            </div>
                        </motion.div>
                    )}

                    {slide === 3 && (
                        <motion.div key="s3" variants={slideVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.5 }}
                            className="text-center space-y-12"
                        >
                            <div className="w-40 h-40 bg-vaultic-orange rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-vaultic-orange/20 rotate-12">
                                <Target className="text-vaultic-ink" size={60} />
                            </div>
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-vaultic-orange italic">Financial Freedom Date</h4>
                                <h2 className="text-9xl font-black tracking-tighter uppercase italic leading-[0.8] text-vaultic-cream">{wrappedStory.freedom_date}</h2>
                                <p className="text-vaultic-muted text-xl font-medium max-w-sm mx-auto leading-relaxed italic">You are {wrappedStory.freedom_countdown} from total freedom. Keep the streak alive.</p>
                            </div>
                        </motion.div>
                    )}

                    {slide > totalSlides && (
                        <motion.div key="s_end" variants={slideVariants} initial="initial" animate="animate" transition={{ duration: 0.5 }}
                            className="text-center space-y-10"
                        >
                            <ShieldCheck className="text-vaultic-orange mx-auto" size={80} />
                            <h2 className="text-6xl font-black tracking-tighter uppercase italic text-vaultic-cream leading-tight">Your DNA <br/> is Secured.🛡️</h2>
                            <p className="text-vaultic-muted text-xl font-medium max-w-lg mx-auto leading-relaxed italic">
                                Finova wrapped isn&apos;t just a review; it&apos;s a strategy. Return to your control center to improve your freedom trajectory.
                            </p>
                            <Link href="/dashboard" className="inline-block px-12 py-5 bg-vaultic-orange text-vaultic-ink rounded-full font-black text-xs hover:scale-105 transition-all uppercase tracking-[0.2em]">
                                Return to Control
                            </Link>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
