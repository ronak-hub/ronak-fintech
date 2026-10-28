"use client";
import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, Lock } from 'lucide-react';
import Image from 'next/image';
import { setCookie } from '@/lib/cookies';
import { fetchApiWithFallback, getGoogleAuthUrl } from '@/lib/api';

function isValidEmail(value: string): boolean {
    const email = value.trim();
    const atIndex = email.indexOf('@');
    const domain = atIndex >= 0 ? email.slice(atIndex + 1) : '';
    return atIndex > 0 && !email.includes('@', atIndex + 1) && domain.includes('.');
}

function validateCredentials(creds: { username: string; email: string; password: string }, isLogin: boolean): string {
    if (!creds.username.trim()) return isLogin ? 'Username or Email is required.' : 'Username is required.';
    if (!isLogin && creds.username.length < 3) return 'Username must be at least 3 characters.';
    if (!isLogin && !creds.email.trim()) return 'Email is required.';
    if (!isLogin && !isValidEmail(creds.email)) return 'Enter a valid email address.';
    if (!creds.password.trim()) return 'Password is required.';
    if (creds.password.length < 8) return 'Password must be at least 8 characters.';
    if (/\s/.test(creds.password)) return 'Password cannot contain spaces.';
    return '';
}

export default function VaulticAuth() {
    const [isLogin, setIsLogin] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [creds, setCreds] = useState({ username: '', email: '', password: '' });
    const [statusMsg, setStatusMsg] = useState('');
    const [statusType, setStatusType] = useState<'info' | 'success' | 'error'>('info'); // 'info' is for loading messages
    const router = useRouter();

    const setSessionAndRedirect = useCallback((token: string) => {
        setCookie('session', token, 1);
        router.push('/dashboard');
    }, [router]);

    useEffect(() => {
        if (typeof globalThis !== 'undefined' && globalThis.window) {
            const params = new URLSearchParams(globalThis.window.location.search);
            const token = params.get('token');
            if (token) {
                params.delete('token');
                const newUrl = globalThis.window.location.pathname + (params.toString() ? `?${params.toString()}` : '');
                globalThis.window.history.replaceState({}, globalThis.document.title, newUrl);
                setSessionAndRedirect(token);
            }
        }
    }, [setSessionAndRedirect]);

    const handleToggleMode = () => {
        setIsLogin(!isLogin);
        setCreds({ username: '', email: '', password: '' });
        setStatusMsg('');
        setStatusType('info');
    };

    const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();

        const validationMsg = validateCredentials(creds, isLogin);
        if (validationMsg) {
            setStatusType('error');
            setStatusMsg(validationMsg);
            return;
        }

        setStatusMsg(''); // Clear previous validation message
        setIsSyncing(true);
        setStatusType('info');
        setStatusMsg(isLogin ? 'VERIFYING IDENTITY...' : 'ENCRYPTING DNA...');

        const endpoint = isLogin ? '/auth/login' : '/auth/signup';

        // Prepare payload based on login or signup
        const payload = isLogin
            ? { username: creds.username, password: creds.password } // Use username field for login
            : { username: creds.username, email: creds.email, password: creds.password };

        try {
            const res = await fetchApiWithFallback(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                let detail = 'IDENTIFICATION FAILED.';
                try {
                    const errorData = await res.json();
                    detail = errorData?.detail || detail;
                } catch {
                    // ignore parse errors
                }
                setIsSyncing(false);
                setStatusType('error');
                setStatusMsg(detail);
                return;
            }

            const data = await res.json();
            if (isLogin) {
                setStatusType('success');
                setStatusMsg('VAULT SECURED. ACCESS GRANTED.');
                setTimeout(() => setSessionAndRedirect(data.access_token), 800);
            } else {
                if (typeof globalThis !== 'undefined' && globalThis.window) {
                    globalThis.window.localStorage.removeItem('vaulticDnaInputs');
                    globalThis.window.localStorage.removeItem('vaulticDnaStep');
                    globalThis.window.dispatchEvent(new CustomEvent('vaulticDnaInputsUpdated'));
                }
                setStatusType('success');
                setStatusMsg('IDENTITY CREATED. INITIALIZE LOGIN.');
                setTimeout(() => {
                    setIsLogin(true);
                    setIsSyncing(false);
                    setStatusMsg('');
                }, 1500);
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Network failure';
            setIsSyncing(false);
            setStatusType('error');
            setStatusMsg(`Network error: ${message}. Is the backend running?`);
        }
    };

    return (
        <div className="vaultic-page relative overflow-hidden px-4 py-4 pt-20">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-[linear-gradient(180deg,_rgba(var(--accent-rgb),0.16),transparent)]" />
            <div className="relative mx-auto flex max-w-xs flex-col gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="vaultic-panel rounded-2xl p-4 backdrop-blur-3xl"
                >
                    <div className="mb-4 text-center">
                        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-vaultic-border bg-vaultic-black/70">
                            <Image src="/logo.svg" alt="Vaultic" width={22} height={22} style={{ width: 'auto', height: 'auto' }} className="opacity-90" />
                        </div>
                        <h2 className="text-xl font-black uppercase tracking-tight">{isLogin ? 'Welcome back' : 'Create your account'}</h2>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-2">
                        {/* Username field: always visible, label changes */}
                        <label htmlFor="username" className="block text-[10px] uppercase tracking-[0.28em] text-vaultic-muted">
                            {isLogin ? 'Username or Email' : 'Username'}
                        </label>
                        <input
                            id="username"
                            type="text"
                            placeholder={isLogin ? "your_username or you@domain.com" : "your_username"}
                            required
                            className="vaultic-input w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                            value={creds.username}
                            onChange={(e) => { setCreds({ ...creds, username: e.target.value }); setStatusMsg(''); }}
                        />

                        {/* Email field: only for signup */}
                        {!isLogin && (
                            <>
                                <label htmlFor="email" className="block text-[10px] uppercase tracking-[0.28em] text-vaultic-muted">Email</label>
                                <input
                                    id="email"
                                    type="email"
                                    placeholder="you@domain.com"
                                    required
                                    className="vaultic-input w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                                    value={creds.email}
                                    onChange={(e) => { setCreds({ ...creds, email: e.target.value }); setStatusMsg(''); }}
                                />
                            </>
                        )}

                        <label htmlFor="password" className="block text-[10px] uppercase tracking-[0.28em] text-vaultic-muted">Password</label>
                        <input
                            id="password"
                            type="password"
                            placeholder="Secure key"
                            required
                            className="vaultic-input w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                            value={creds.password}
                            onChange={(e) => {
                                setCreds({ ...creds, password: e.target.value });
                                setStatusMsg('');
                            }}
                        />

                        <button
                            type="submit"
                            disabled={isSyncing}
                            className="vaultic-btn-primary relative z-20 w-full rounded-xl px-4 py-2.5 text-xs uppercase tracking-[0.14em] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSyncing ? <Loader2 className="animate-spin" size={18} /> : null}
                            {isLogin ? 'Sign in' : 'Create account'}
                            <ArrowRight size={18} />
                        </button>
                    </form>

                    {statusMsg && (statusType === 'error' || statusType === 'success') && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`mt-2 p-2.5 rounded-xl border flex items-start gap-2 ${statusType === 'error' ? 'vaultic-alert-error' : 'vaultic-alert-success'}`}
                        >
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 flex-shrink-0 ${statusType === 'error' ? 'bg-vaultic-error/20 border-vaultic-error/40' : 'bg-vaultic-success/20 border-vaultic-success/40'}`}>
                                <span className={`${statusType === 'error' ? 'text-vaultic-error' : 'text-vaultic-success'} text-xs font-bold`}>{statusType === 'error' ? '!' : '✓'}</span>
                            </div>
                            <p className="text-sm font-semibold leading-relaxed">{statusMsg}</p>
                        </motion.div>
                    )}

                    <div className="mt-3 flex items-center justify-center gap-3 text-xs text-vaultic-muted">
                        <div className="h-px w-10 bg-vaultic-surface/40" />
                        <span>or</span>
                        <div className="h-px w-10 bg-vaultic-surface/40" />
                    </div>

                    <button
                        type="button"
                        onClick={() => { globalThis.window.location.href = getGoogleAuthUrl(); }}
                        className="vaultic-btn-secondary mt-2 w-full rounded-xl px-4 py-2.5 text-sm"
                    >
                        <Image src="/google.svg" alt="Google" width={20} height={20} />
                        Sign in with Google
                    </button>

                    <div className="mt-4 border-t border-vaultic-border pt-3 text-center text-[10px] uppercase tracking-[0.18em] text-vaultic-muted">
                        <button
                            type="button"
                            onClick={handleToggleMode}
                            className="font-black text-white transition hover:text-vaultic-orange"
                        >
                            {isLogin ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
                        </button>
                        <div className="mt-2 flex items-center justify-center gap-2 opacity-60">
                            <Lock size={12} className="text-vaultic-orange" />
                            <span>AES-256 ENCRYPTED DNA</span>
                        </div>
                        <a
                            href="mailto:vaultic123@gmail.com"
                            className="mt-2 inline-flex items-center justify-center gap-2 text-[9px] uppercase tracking-[0.16em] text-vaultic-muted transition hover:text-vaultic-orange"
                        >
                            Need help? vaultic123@gmail.com
                        </a>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
