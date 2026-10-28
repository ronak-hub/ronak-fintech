"use client";
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, ShieldAlert, ArrowDownRight, RefreshCw, Layers, Plus, Trash2, Upload, CheckCircle2, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { clearAuthToken, getAuthToken } from '@/lib/cookies';

const getApiBaseCandidates = () => {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  return Array.from(new Set([
    configured,
    'http://127.0.0.1:8002',
    'http://localhost:8002',
    'http://127.0.0.1:8001',
    'http://localhost:8001',
  ].filter(Boolean) as string[]));
};

export default function WealthAuditPage() {
  type ExtraExpense = {
    id: string;
    category: string;
    amount: number;
  };

  type IncentiveEntry = {
    id: string;
    name: string;
    amount: number;
    type: 'bonus' | 'profit' | 'incentive' | 'other';
  };

  type ParsedTransaction = {
    id: string;
    merchant: string;
    amount: number;
    category: string;
    date: string;
    transaction_type: string;
    mode?: string;
    source_text?: string;
    selected: boolean;
  };

  const expenseCategories = ['Rent', 'EMI', 'Insurance', 'Utilities', 'Groceries', 'Subscriptions', 'Travel', 'Misc'];
  const parsedCategoryOptions = ['Food & Dining', 'Shopping', 'Transport & Fuel', 'Bills & Utilities', 'Entertainment', 'Healthcare', 'Investment', 'Other'];
  const incentiveTypes = [
    { value: 'bonus', label: 'Bonus' },
    { value: 'profit', label: 'Profit' },
    { value: 'incentive', label: 'Incentive' },
    { value: 'other', label: 'Other' },
  ];

  const [loading, setLoading] = useState(true);
  const [ledgerData, setLedgerData] = useState<{ history: Array<{ merchant: string; amount: number; category: string; timestamp: string }>; total_volume: number } | null>(null);
  const [profileData, setProfileData] = useState<{ monthly_income?: number; rent?: number; emis?: number; insurance?: number; current_bank_balance?: number; target_savings_rate?: number } | null>(null);
  const [extraExpenses, setExtraExpenses] = useState<ExtraExpense[]>([]);
  const [incentives, setIncentives] = useState<IncentiveEntry[]>([]);
  const [smsInput, setSmsInput] = useState("");
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [parserBusy, setParserBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [parserMessage, setParserMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  const extraExpensesTotal = useMemo(
    () => extraExpenses.reduce((sum, expense) => sum + Math.max(0, expense.amount), 0),
    [extraExpenses]
  );

  const baseFixedExpenses = useMemo(
    () => (profileData?.rent || 0) + (profileData?.emis || 0) + (profileData?.insurance || 0),
    [profileData]
  );

  const totalMonthlyOutflow = useMemo(
    () => baseFixedExpenses + extraExpensesTotal,
    [baseFixedExpenses, extraExpensesTotal]
  );

  const incentivesTotal = useMemo(
    () => incentives.reduce((sum, incentive) => sum + Math.max(0, incentive.amount), 0),
    [incentives]
  );

  const netMonthlyBuffer = useMemo(
    () => (profileData?.monthly_income || 0) - totalMonthlyOutflow + incentivesTotal,
    [profileData, totalMonthlyOutflow, incentivesTotal]
  );

  const auditVelocity = useMemo(
    () => profileData?.monthly_income
      ? Math.max(0, Math.round(((profileData.monthly_income || 0) - totalMonthlyOutflow) / Math.max(1, profileData.monthly_income || 1) * 100))
      : 0,
    [profileData, totalMonthlyOutflow]
  );

  const runwayMonths = useMemo(
    () => profileData?.current_bank_balance && totalMonthlyOutflow > 0
      ? Math.max(0, Math.floor((profileData.current_bank_balance || 0) / totalMonthlyOutflow))
      : null,
    [profileData, totalMonthlyOutflow]
  );

  const runwayLabel = runwayMonths == null ? 'N/A' : `${runwayMonths}m`;

  const categoryData = useMemo(() => {
    const baseItems = profileData
      ? [
          { category: 'Rent', amount: profileData.rent || 0 },
          { category: 'EMI', amount: profileData.emis || 0 },
          { category: 'Insurance', amount: profileData.insurance || 0 },
        ].filter((item) => item.amount > 0)
      : [];

    const extraItems = extraExpenses.filter((item) => item.amount > 0);
    const merged = [...baseItems, ...extraItems].filter((item) => item.amount > 0);

    if (merged.length > 0) {
      const tally = merged.reduce<Record<string, number>>((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + item.amount;
        return acc;
      }, {});
      return Object.entries(tally)
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 6);
    }

    if (!ledgerData?.history) return [];
    const tally = ledgerData.history.reduce<Record<string, number>>((acc, tx) => {
      acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
      return acc;
    }, {});
    return Object.entries(tally)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
  }, [ledgerData, profileData, extraExpenses]);

  const addExtraExpense = () => {
    setExtraExpenses((current) => [
      ...current,
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, category: 'Misc', amount: 0 },
    ]);
  };

  const updateExtraExpense = (id: string, field: 'category' | 'amount', value: string | number) => {
    setExtraExpenses((current) => current.map((expense) => {
      if (expense.id !== id) return expense;
      return {
        ...expense,
        [field]: field === 'amount' ? Number(value) : String(value),
      };
    }));
  };

  const removeExtraExpense = (id: string) => {
    setExtraExpenses((current) => current.filter((expense) => expense.id !== id));
  };

  const addIncentiveEntry = () => {
    setIncentives((current) => [
      ...current,
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: 'New incentive', amount: 0, type: 'bonus' },
    ]);
  };

  const updateIncentiveEntry = (id: string, field: 'name' | 'amount' | 'type', value: string | number) => {
    setIncentives((current) => current.map((entry) => {
      if (entry.id !== id) return entry;
      if (field === 'amount') {
        return { ...entry, amount: Number(value) };
      }
      return { ...entry, [field]: String(value) };
    }));
  };

  const removeIncentiveEntry = (id: string) => {
    setIncentives((current) => current.filter((entry) => entry.id !== id));
  };

  const handleParseTransactions = async () => {
    const rawSms = smsInput.trim();
    if (!rawSms) {
      setParserMessage({ type: 'error', text: 'Paste your banking SMS history before parsing.' });
      return;
    }

    setParserBusy(true);
    setParserMessage(null);
    try {
      const token = getAuthToken();
      if (!token) {
        clearAuthToken();
        router.replace('/login');
        return;
      }

      let response: Response | null = null;
      let lastError: unknown = null;
      for (const apiBase of getApiBaseCandidates()) {
        try {
          response = await fetch(`${apiBase}/api/parse-sms`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ raw_sms: rawSms }),
          });
          if (response.ok || response.status === 401 || response.status === 422 || response.status === 400) {
            break;
          }
        } catch (error) {
          lastError = error;
        }
      }

      if (!response) throw lastError ?? new Error('Vaultic backend is not reachable.');

      const result = await response.json();
      if (response.status === 401) {
        clearAuthToken();
        router.replace('/login');
        return;
      }
      if (!response.ok) throw new Error(result.detail || 'Vaultic could not parse those SMS messages.');

      const rows = (result.transactions || []).map((tx: Omit<ParsedTransaction, 'id' | 'selected'>, index: number) => ({
        ...tx,
        id: `${tx.merchant}-${tx.amount}-${tx.date}-${index}`,
        selected: tx.transaction_type !== 'Credit',
      }));
      setParsedTransactions(rows);
      setParserMessage({
        type: 'success',
        text: `${rows.length} transaction${rows.length === 1 ? '' : 's'} extracted${result.failed_count ? `, ${result.failed_count} message${result.failed_count === 1 ? '' : 's'} skipped` : ''}.`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'SMS parsing failed. Try complete bank messages with amount and merchant details.';
      setParserMessage({ type: 'error', text: message });
    } finally {
      setParserBusy(false);
    }
  };

  const handleClearParser = () => {
    setSmsInput("");
    setParsedTransactions([]);
    setParserMessage(null);
  };

  const updateParsedTransaction = (id: string, field: 'category' | 'selected', value: string | boolean) => {
    setParsedTransactions((current) => current.map((tx) => (
      tx.id === id ? { ...tx, [field]: value } : tx
    )));
  };

  const handleImportTransactions = async () => {
    const selectedTransactions = parsedTransactions.filter((tx) => tx.selected);
    if (selectedTransactions.length === 0) {
      setParserMessage({ type: 'error', text: 'Select at least one parsed transaction to import.' });
      return;
    }

    setImportBusy(true);
    setParserMessage(null);
    try {
      const token = getAuthToken();
      if (!token) {
        clearAuthToken();
        router.replace('/login');
        return;
      }

      let response: Response | null = null;
      let lastError: unknown = null;
      for (const apiBase of getApiBaseCandidates()) {
        try {
          response = await fetch(`${apiBase}/api/import-sms-transactions`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              transactions: selectedTransactions.map(({ id, selected, mode, ...tx }) => tx),
            }),
          });
          if (response.ok || response.status === 401 || response.status === 400) {
            break;
          }
        } catch (error) {
          lastError = error;
        }
      }

      if (!response) throw lastError ?? new Error('Vaultic backend is not reachable.');

      const result = await response.json();
      if (response.status === 401) {
        clearAuthToken();
        router.replace('/login');
        return;
      }
      if (!response.ok) throw new Error(result.detail || 'Import failed.');

      setParserMessage({
        type: 'success',
        text: `${result.imported_count || 0} imported, ${result.duplicate_count || 0} duplicate${result.duplicate_count === 1 ? '' : 's'} ignored, ${result.skipped_count || 0} skipped.`,
      });
      setParsedTransactions([]);
      setSmsInput("");
      await fetchAuditLedger();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('vaulticDnaInputsUpdated'));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Import failed. Review parsed rows and try again.';
      setParserMessage({ type: 'error', text: message });
    } finally {
      setImportBusy(false);
    }
  };

  const handleSmsDrop = (event: React.DragEvent<HTMLTextAreaElement>) => {
    event.preventDefault();
    const droppedText = event.dataTransfer.getData('text');
    if (droppedText) {
      setSmsInput((current) => `${current}${current ? '\n' : ''}${droppedText}`);
    }
  };

  const fetchAuditLedger = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const token = getAuthToken();
      if (!token) {
        clearAuthToken();
        router.replace('/login');
        return;
      }

      let response: Response | null = null;
      let lastError: unknown = null;
      let activeApiBase = '';
      for (const apiBase of getApiBaseCandidates()) {
        try {
          response = await fetch(`${apiBase}/analytics/transactions`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          if (response.ok || response.status === 401) {
            activeApiBase = apiBase;
            break;
          }
        } catch (error) {
          lastError = error;
        }
      }

      if (!response) throw lastError ?? new Error('Vaultic backend is not reachable.');

      if (response.status === 401) {
        clearAuthToken();
        router.replace('/login');
        return;
      }

      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || "Failed to fetch telemetry.");

      setLedgerData(result);

      const summaryResponse = await fetch(`${activeApiBase}/dashboard/summary`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (summaryResponse.status === 401) {
        clearAuthToken();
        router.replace('/login');
        return;
      }

      if (summaryResponse.ok) {
        const summaryResult = await summaryResponse.json();
        setProfileData(summaryResult.user_profile ?? null);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Engine telemetry handshake interrupted.";
      console.error(err);
      setErrorMsg(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const storedIncentives = window.localStorage.getItem('vaulticAuditIncentives');
      if (storedIncentives) {
        setIncentives(JSON.parse(storedIncentives));
      }
    } catch {
      setIncentives([]);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('vaulticAuditIncentives', JSON.stringify(incentives));
  }, [incentives]);

  useEffect(() => {
    void fetchAuditLedger();
  }, [fetchAuditLedger]);

  if (loading) return (
    <div className="min-h-screen bg-vaultic-black flex flex-col items-center justify-center gap-4">
      <RefreshCw className="animate-spin text-vaultic-cyan" size={32} />
      <p className="text-vaultic-cyan font-mono text-[9px] uppercase tracking-[0.3em]">Parsing Ledger Streams...</p>
    </div>
  );

  return (
    <div className="vaultic-page min-w-0 p-4 sm:p-6 md:p-8 lg:p-12 font-sans">
      {/* HEADER SECTION */}
      <header className="flex flex-col gap-5 sm:flex-row sm:justify-between sm:items-center mb-10 lg:mb-14">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-vaultic-cyan/10 border border-vaultic-cyan/20 rounded-lg flex items-center justify-center text-vaultic-cyan">
              <Activity size={16} />
            </div>
            <span className="text-[10px] font-mono tracking-[0.2em] text-vaultic-cyan uppercase">System Diagnostic</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight uppercase italic text-vaultic-cream">Wealth Audit</h1>
          <p className="text-vaultic-muted text-sm mt-2 italic">Real-time systemic capital drain analytics and transactional logs.</p>
        </div>

        <div className="flex gap-3 items-center">
          <button 
            onClick={fetchAuditLedger}
            className="vaultic-btn-secondary rounded-2xl p-4 px-6 text-xs uppercase tracking-wider"
          >
            <RefreshCw size={14} />
            Sync Stream
          </button>
        </div>
      </header>

      {errorMsg ? (
        <div className="border border-vaultic-error/20 bg-vaultic-error/10 p-6 rounded-3xl text-center max-w-xl mx-auto">
          <ShieldAlert className="text-vaultic-error mx-auto mb-3" size={32} />
          <p className="text-xs font-mono text-vaultic-error uppercase tracking-wider">{errorMsg}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_28rem] xl:grid-cols-[minmax(0,1fr)_32rem] gap-8 min-w-0">
          {/* LEFT: USER PROFILE SUMMARY */}
          <div className="space-y-6">
            <div className="vaultic-panel p-6 sm:p-8 rounded-3xl">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tighter text-vaultic-cream">Profile Snapshot</h3>
                  <p className="text-xs text-vaultic-muted mt-2">Your core financial state and monthly operating health.</p>
                </div>
                <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.35em] text-vaultic-mint font-black py-2 px-3 rounded-full bg-vaultic-mint/10 border border-vaultic-mint/20">
                  Account Verified
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-vaultic-black/70 border border-vaultic-border p-5 rounded-2xl">
                  <p className="text-[9px] uppercase tracking-[0.35em] text-vaultic-muted">Monthly Income</p>
                  <p className="whitespace-nowrap text-3xl font-black text-vaultic-cream mt-3">₹{(profileData?.monthly_income || 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-vaultic-black/70 border border-vaultic-border p-5 rounded-2xl">
                  <p className="text-[9px] uppercase tracking-[0.35em] text-vaultic-muted">Liquid Balance</p>
                  <p className="whitespace-nowrap text-3xl font-black text-vaultic-cream mt-3">₹{(profileData?.current_bank_balance || 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-vaultic-black/70 border border-vaultic-border p-5 rounded-2xl">
                  <p className="text-[9px] uppercase tracking-[0.35em] text-vaultic-muted">Savings Target</p>
                  <p className="whitespace-nowrap text-3xl font-black text-vaultic-mint mt-3">{Math.round((profileData?.target_savings_rate || 0) * 100)}%</p>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="bg-vaultic-black/70 border border-vaultic-border p-5 rounded-2xl">
                  <p className="text-[8px] uppercase tracking-[0.35em] text-vaultic-muted">Audit Velocity</p>
                  <p className="whitespace-nowrap text-3xl font-black text-vaultic-cream mt-3">{auditVelocity}%</p>
                </div>
                <div className="bg-vaultic-black/70 border border-vaultic-border p-5 rounded-2xl">
                  <p className="text-[8px] uppercase tracking-[0.35em] text-vaultic-muted">Runway</p>
                  <p className="text-3xl font-black text-vaultic-mint mt-3">{runwayLabel}</p>
                </div>
              </div>
            </div>

            <div className="vaultic-panel p-6 sm:p-8 rounded-3xl">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-vaultic-cyan/10 border border-vaultic-cyan/20 rounded-lg flex items-center justify-center text-vaultic-cyan">
                      <Upload size={15} />
                    </div>
                    <span className="text-[10px] font-mono tracking-[0.2em] text-vaultic-cyan uppercase">SMS Intake</span>
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-tighter text-vaultic-cream">Import Bank Transactions</h3>
                  <p className="text-xs text-vaultic-muted mt-2">Paste banking SMS history and review extracted expenses before they enter Vaultic.</p>
                </div>
                <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-vaultic-mint font-black py-2 px-3 rounded-full bg-vaultic-mint/10 border border-vaultic-mint/20">
                  Native Ledger
                </span>
              </div>

              <textarea
                value={smsInput}
                onChange={(event) => setSmsInput(event.target.value)}
                onDrop={handleSmsDrop}
                onDragOver={(event) => event.preventDefault()}
                placeholder="Paste your banking SMS messages here..."
                className="vaultic-input min-h-56 w-full resize-y rounded-3xl p-5 text-sm leading-7 outline-none"
              />

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-[10px] uppercase tracking-[0.28em] text-vaultic-muted">
                  UPI / Cards / ATM / IMPS / NEFT / RTGS
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleClearParser}
                    className="vaultic-btn-secondary rounded-2xl px-5 py-3 text-[10px] uppercase tracking-widest"
                  >
                    <XCircle size={14} />
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={handleParseTransactions}
                    disabled={parserBusy}
                    className="vaultic-btn-primary rounded-2xl px-5 py-3 text-[10px] uppercase tracking-widest disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {parserBusy ? <RefreshCw className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                    Parse Transactions
                  </button>
                </div>
              </div>

              {parserMessage && (
                <div className={`mt-5 rounded-2xl border p-4 text-xs ${
                  parserMessage.type === 'error'
                    ? 'vaultic-alert-error'
                    : parserMessage.type === 'success'
                      ? 'vaultic-alert-success'
                      : 'border-vaultic-cyan/20 bg-vaultic-cyan/10 text-vaultic-cyan'
                }`}>
                  {parserMessage.text}
                </div>
              )}

              {parsedTransactions.length > 0 && (
                <div className="mt-6 overflow-hidden rounded-3xl border border-vaultic-border bg-vaultic-black/55">
                  <div className="flex flex-col gap-2 border-b border-vaultic-border p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-vaultic-cyan">Review Import</p>
                      <p className="mt-1 text-xs text-vaultic-muted">Adjust categories and deselect rows that should stay out of Vaultic.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleImportTransactions}
                      disabled={importBusy}
                      className="vaultic-btn-secondary rounded-2xl px-5 py-3 text-[10px] uppercase tracking-widest text-vaultic-mint disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {importBusy ? <RefreshCw className="animate-spin" size={14} /> : <Upload size={14} />}
                      Import into Vaultic
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-[760px] w-full text-left text-xs">
                      <thead className="bg-vaultic-surface/80 text-[9px] uppercase tracking-[0.24em] text-vaultic-muted">
                        <tr>
                          <th className="p-4">Use</th>
                          <th className="p-4">Merchant</th>
                          <th className="p-4">Amount</th>
                          <th className="p-4">Category</th>
                          <th className="p-4">Date</th>
                          <th className="p-4">Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedTransactions.map((tx) => (
                          <tr key={tx.id} className="border-t border-vaultic-border/70">
                            <td className="p-4">
                              <input
                                aria-label={`Select ${tx.merchant}`}
                                type="checkbox"
                                checked={tx.selected}
                                onChange={(event) => updateParsedTransaction(tx.id, 'selected', event.target.checked)}
                                className="h-4 w-4 accent-vaultic-orange"
                              />
                            </td>
                            <td className="p-4">
                              <p className="font-black text-vaultic-cream">{tx.merchant}</p>
                              {tx.mode && <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-vaultic-muted">{tx.mode}</p>}
                            </td>
                            <td className="p-4 font-black text-vaultic-orange">INR {tx.amount.toLocaleString('en-IN')}</td>
                            <td className="p-4">
                              <select
                                aria-label={`Category for ${tx.merchant}`}
                                value={tx.category}
                                onChange={(event) => updateParsedTransaction(tx.id, 'category', event.target.value)}
                                className="vaultic-input w-full rounded-2xl p-3 outline-none"
                              >
                                {parsedCategoryOptions.map((category) => (
                                  <option key={category} value={category}>{category}</option>
                                ))}
                              </select>
                            </td>
                            <td className="p-4 text-vaultic-muted">{tx.date}</td>
                            <td className="p-4">
                              <span className={`rounded-full border px-3 py-1 text-[9px] uppercase tracking-[0.2em] ${
                                tx.transaction_type === 'Credit'
                                  ? 'border-vaultic-mint/30 bg-vaultic-mint/10 text-vaultic-mint'
                                  : 'border-vaultic-orange/30 bg-vaultic-orange/10 text-vaultic-orange'
                              }`}>
                                {tx.transaction_type}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="vaultic-panel p-6 sm:p-8 rounded-3xl">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div>
                  <h4 className="text-[10px] font-mono tracking-widest text-vaultic-cyan uppercase">Extra Expenses</h4>
                  <p className="text-xs text-vaultic-muted mt-1">Track variable categories added this month.</p>
                </div>
                <button
                  type="button"
                  onClick={addExtraExpense}
                  className="vaultic-btn-secondary rounded-2xl px-4 py-2 text-[10px] uppercase tracking-widest text-vaultic-mint"
                >
                  <Plus size={14} /> Add
                </button>
              </div>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                {extraExpenses.length === 0 ? (
                  <p className="text-xs text-vaultic-muted">No extra categories added yet. Add custom monthly expenses to the audit pulse.</p>
                ) : extraExpenses.map((expense) => (
                  <div key={expense.id} className="grid grid-cols-1 gap-3 bg-vaultic-black/70 border border-vaultic-border p-3 rounded-2xl sm:grid-cols-[minmax(18rem,1.8fr)_minmax(12rem,0.9fr)_auto] sm:items-center">
                    <select
                      aria-label="Expense category selection"
                      value={expense.category}
                      onChange={(e) => updateExtraExpense(expense.id, 'category', e.target.value)}
                      className="vaultic-input w-full p-3 rounded-2xl text-sm outline-none"
                    >
                      {expenseCategories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={0}
                      placeholder="₹ Amount"
                      value={expense.amount}
                      onChange={(e) => updateExtraExpense(expense.id, 'amount', Number(e.target.value))}
                      className="vaultic-input w-full p-3 rounded-2xl text-sm outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeExtraExpense(expense.id)}
                      aria-label="Remove extra expense"
                      title="Remove extra expense"
                      className="justify-self-start bg-vaultic-error/10 border border-vaultic-error/20 p-3 rounded-2xl hover:bg-vaultic-error/20 transition sm:justify-self-auto"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              {extraExpenses.length > 0 && (
                <div className="mt-6 bg-vaultic-black/70 border border-vaultic-border rounded-3xl p-5">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-vaultic-muted">Extra spend total</p>
                  <p className="whitespace-nowrap text-3xl font-black text-vaultic-orange mt-3">₹{extraExpenses.reduce((sum, expense) => sum + expense.amount, 0).toLocaleString('en-IN')}</p>
                </div>
              )}
            </div>

            <div className="vaultic-panel p-6 sm:p-8 rounded-3xl">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div>
                  <h4 className="text-[10px] font-mono tracking-widest text-vaultic-cyan uppercase">Incentives & Profits</h4>
                  <p className="text-xs text-vaultic-muted mt-1">Capture bonuses, profits, or side-income that improve your runway.</p>
                </div>
                <button
                  type="button"
                  onClick={addIncentiveEntry}
                  className="vaultic-btn-secondary rounded-2xl px-4 py-2 text-[10px] uppercase tracking-widest text-vaultic-mint"
                >
                  <Plus size={14} /> Add
                </button>
              </div>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                {incentives.length === 0 ? (
                  <p className="text-xs text-vaultic-muted">No incentives logged yet. Add a bonus, profit, or referral payment to strengthen the audit profile.</p>
                ) : incentives.map((entry) => (
                  <div key={entry.id} className="grid grid-cols-1 gap-3 bg-vaultic-black/70 border border-vaultic-border p-3 rounded-2xl md:grid-cols-[1.2fr_0.9fr_0.8fr_auto] md:items-center">
                    <input
                      type="text"
                      placeholder="Bonus name"
                      value={entry.name}
                      onChange={(e) => updateIncentiveEntry(entry.id, 'name', e.target.value)}
                      className="vaultic-input w-full p-3 rounded-2xl text-sm outline-none"
                    />
                    <input
                      type="number"
                      min={0}
                      placeholder="₹ Amount"
                      value={entry.amount}
                      onChange={(e) => updateIncentiveEntry(entry.id, 'amount', Number(e.target.value))}
                      className="vaultic-input w-full p-3 rounded-2xl text-sm outline-none"
                    />
                    <select
                      aria-label="Incentive type"
                      value={entry.type}
                      onChange={(e) => updateIncentiveEntry(entry.id, 'type', e.target.value)}
                      className="vaultic-input w-full p-3 rounded-2xl text-sm outline-none"
                    >
                      {incentiveTypes.map((type) => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeIncentiveEntry(entry.id)}
                      aria-label="Remove incentive"
                      title="Remove incentive"
                      className="justify-self-start bg-vaultic-error/10 border border-vaultic-error/20 p-3 rounded-2xl hover:bg-vaultic-error/20 transition md:justify-self-auto"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              {incentives.length > 0 && (
                <div className="mt-6 bg-vaultic-mint/10 border border-vaultic-mint/20 rounded-3xl p-5">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-vaultic-muted">Incoming uplift</p>
                  <p className="whitespace-nowrap text-3xl font-black text-vaultic-mint mt-3">₹{incentivesTotal.toLocaleString('en-IN')}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="vaultic-panel p-6 rounded-3xl">
                <p className="text-[10px] uppercase tracking-[0.35em] text-vaultic-muted mb-4">Expense Profile</p>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm text-vaultic-muted">
                    <span>Rent</span>
                    <span className="font-black text-vaultic-cream">₹{(profileData?.rent || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-vaultic-muted">
                    <span>EMI</span>
                    <span className="font-black text-vaultic-cream">₹{(profileData?.emis || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-vaultic-muted">
                    <span>Insurance</span>
                    <span className="font-black text-vaultic-cream">₹{(profileData?.insurance || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              <div className="vaultic-panel p-6 rounded-3xl">
                <p className="text-[10px] uppercase tracking-[0.35em] text-vaultic-muted mb-4">Financial Health</p>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm text-vaultic-muted">
                    <span>Total monthly outflow</span>
                    <span className="font-black text-vaultic-orange">₹{totalMonthlyOutflow.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-vaultic-muted">
                    <span>Available runway</span>
                    <span className="font-black text-vaultic-cream">{runwayLabel === 'N/A' ? 'N/A' : `${runwayMonths} months`}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-vaultic-muted">
                    <span>Net monthly buffer</span>
                    <span className="font-black text-vaultic-mint">₹{netMonthlyBuffer.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: AGGREGATE SUMMARY COCKPIT */}
          <div className="space-y-6 min-w-0">
            <div className="vaultic-panel p-6 sm:p-8 rounded-3xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 text-vaultic-cyan/10">
                <Layers size={80} />
              </div>
              <div className="mb-4">
                <h4 className="text-[10px] font-mono tracking-widest text-vaultic-muted uppercase">Total Monitored Vol.</h4>
                <p className="text-[11px] text-vaultic-slate mt-2">Live transaction throughput across accounts.</p>
              </div>
              <h2 className="text-5xl font-black italic tracking-tight text-vaultic-cream">
                ₹{ledgerData?.total_volume?.toLocaleString() || 0}
              </h2>
              <div className="mt-6 p-4 bg-vaultic-surface/70 rounded-3xl border border-vaultic-border text-sm leading-relaxed text-vaultic-muted">
                <div className="flex items-start gap-3">
                  <ArrowDownRight className="text-vaultic-cyan shrink-0 mt-0.5" size={16} />
                  <span>Telemetry parsing is active. All financial events generated via SMS notifications are routing through the extraction gateway automatically.</span>
                </div>
              </div>
            </div>

            <div className="vaultic-panel p-6 sm:p-8 rounded-3xl">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div>
                  <h4 className="text-[10px] font-mono tracking-widest text-vaultic-cyan uppercase">Monthly Expense Breakdown</h4>
                  <p className="text-xs text-vaultic-muted mt-1">Core fixed outflows from your profile.</p>
                </div>
                <span className="text-[10px] uppercase tracking-[0.35em] text-vaultic-orange font-black">Budget Lens</span>
              </div>
              <div className="grid gap-3">
                <div className="grid grid-cols-[1fr_auto] gap-4 p-4 rounded-3xl bg-vaultic-black/70 border border-vaultic-border items-center">
                  <span className="text-[10px] uppercase tracking-[0.35em] text-vaultic-muted">Rent</span>
                  <span className="font-black text-vaultic-cream">₹{(profileData?.rent || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-4 p-4 rounded-3xl bg-vaultic-black/70 border border-vaultic-border items-center">
                  <span className="text-[10px] uppercase tracking-[0.35em] text-vaultic-muted">EMI</span>
                  <span className="font-black text-vaultic-cream">₹{(profileData?.emis || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-4 p-4 rounded-3xl bg-vaultic-black/70 border border-vaultic-border items-center">
                  <span className="text-[10px] uppercase tracking-[0.35em] text-vaultic-muted">Insurance</span>
                  <span className="font-black text-vaultic-cream">₹{(profileData?.insurance || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-4 p-4 rounded-3xl bg-vaultic-orange/10 border border-vaultic-orange/30 items-center">
                  <span className="text-[10px] uppercase tracking-[0.35em] text-vaultic-muted">Total Core Expenses</span>
                  <span className="font-black text-vaultic-orange">₹{baseFixedExpenses.toLocaleString('en-IN')}</span>
                </div>
                {extraExpensesTotal > 0 && (
                  <div className="grid grid-cols-[1fr_auto] gap-4 p-4 rounded-3xl bg-vaultic-mint/10 border border-vaultic-mint/20 items-center">
                    <span className="text-[10px] uppercase tracking-[0.35em] text-vaultic-muted">Extra Expenses</span>
                    <span className="font-black text-vaultic-mint">₹{extraExpensesTotal.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="grid grid-cols-[1fr_auto] gap-4 p-4 rounded-3xl bg-vaultic-orange/10 border border-vaultic-orange/30 items-center">
                  <span className="text-[10px] uppercase tracking-[0.35em] text-vaultic-muted">Total Outflow</span>
                  <span className="font-black text-vaultic-orange">₹{totalMonthlyOutflow.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <div className="vaultic-panel p-6 sm:p-8 rounded-3xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-[10px] font-mono tracking-widest text-vaultic-cyan uppercase">Category Pulse</h4>
                  <p className="text-xs text-vaultic-muted mt-1">Recent spend categories by volume.</p>
                </div>
                <span className="text-[10px] uppercase tracking-[0.35em] text-vaultic-cyan">Top 6</span>
              </div>
              {categoryData.length > 0 ? (
                <div className="h-64 min-w-0 overflow-x-auto">
                  <div className="min-w-[620px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryData} margin={{ top: 12, right: 0, left: 0, bottom: 0 }}>
                        <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 10 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 10 }} width={24} />
                        <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--foreground)' }} />
                        <Bar dataKey="amount" fill="var(--cyan)" radius={[12, 12, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-vaultic-muted">No category activity yet. Run a stream sync to populate audit charts.</p>
              )}
            </div>

            <div className="vaultic-panel border-vaultic-cyan/20 p-8 rounded-[3rem]">
              <h4 className="text-[10px] font-mono tracking-widest text-vaultic-cyan uppercase mb-2">Diagnostic Integrity</h4>
              <p className="text-xs text-vaultic-muted leading-relaxed font-light">
                Vaultic checks classification accuracy against established macro data groups. To inject raw transactions and update state tables, deploy a payload to the intake gateway.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
