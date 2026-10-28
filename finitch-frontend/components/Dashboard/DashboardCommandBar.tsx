"use client";

import { useState } from 'react';
import { Command, Loader2, SendHorizontal } from 'lucide-react';

interface DashboardCommandBarProps {
  onAsk: (query: string) => string;
}

export default function DashboardCommandBar({ onAsk }: DashboardCommandBarProps) {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResponse('');

    window.setTimeout(() => {
      setResponse(onAsk(query));
      setLoading(false);
    }, 500);
  };

  return (
    <div className="rounded-[1.75rem] border border-vaultic-border/70 bg-vaultic-surface/80 p-5 shadow-lg shadow-black/10">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.35em] text-vaultic-muted">
        <Command size={14} className="text-vaultic-cyan" />
        Quick help
      </div>
      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ask about your budget or goals"
          className="w-full rounded-2xl border border-vaultic-border/60 bg-vaultic-black/35 px-4 py-3 text-sm outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full bg-vaultic-golden px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-black transition hover:opacity-90 disabled:opacity-70"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <SendHorizontal size={16} />}
          Ask
        </button>
      </form>
      {response ? <p className="mt-4 rounded-2xl border border-vaultic-border/60 bg-vaultic-black/25 p-3 text-sm leading-7 text-vaultic-muted">{response}</p> : null}
    </div>
  );
}
