"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, Loader2, Mail, MessageSquare, Wrench } from "lucide-react";

export const SUPPORT_EMAIL = "vaultic123@gmail.com";

const infoCards = [
  {
    title: "Direct engineer responses",
    description: "Questions go straight to the Vaultic team — no ticket maze, no generic bot replies.",
    icon: MessageSquare,
  },
  {
    title: "Custom schema tailoring",
    description: "Need a specific workflow, integration, or onboarding path? Tell us what you are building.",
    icon: Wrench,
  },
];

export const ContactSection = () => {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [confirmedEmail, setConfirmedEmail] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    setErrorMessage("");
    setConfirmedEmail("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = (await response.json()) as { detail?: string; message?: string };

      if (!response.ok) {
        throw new Error(data.detail ?? "Unable to send your message right now.");
      }

      setConfirmedEmail(form.email);
      setStatus("success");
      setForm({ name: "", email: "", message: "" });
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Unable to send your message right now.");
    }
  };

  return (
    <section id="contact" className="py-20">
      <div className="space-y-4 text-center">
        <p className="text-sm uppercase tracking-[0.4em] text-vaultic-cyan/70">Contact us</p>
        <h2 className="text-3xl font-black sm:text-5xl">
          Get in touch with
          <span className="block text-vaultic-orange">Vaultic.</span>
        </h2>
        <p className="mx-auto max-w-2xl text-base leading-8 text-white/65">
          Send your message below — we will receive it instantly and you will get a confirmation email at the address you provide.
        </p>
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-5">
          {infoCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.22)]"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-vaultic-orange/10 text-vaultic-orange">
                  <Icon size={20} />
                </div>
                <h3 className="text-lg font-bold text-white">{card.title}</h3>
                <p className="mt-2 text-sm leading-7 text-white/65">{card.description}</p>
              </div>
            );
          })}

          <div className="flex items-center gap-4 rounded-[2rem] border border-vaultic-cyan/25 bg-vaultic-cyan/10 p-6">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-vaultic-cyan/15 text-vaultic-cyan">
              <Mail size={20} />
            </div>
            <div className="text-left">
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-white/45">Support inbox</p>
              <p className="mt-1 text-base font-semibold text-white">{SUPPORT_EMAIL}</p>
              <p className="mt-1 text-xs text-white/50">Messages from this form are delivered here automatically.</p>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[2.5rem] border border-white/10 bg-white/[0.03] p-8 sm:p-10"
        >
          <div className="space-y-5">
            <div>
              <label htmlFor="contact-name" className="mb-2 block text-xs font-bold uppercase tracking-[0.3em] text-white/50">
                Name
              </label>
              <input
                id="contact-name"
                type="text"
                required
                autoComplete="name"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="vaultic-input w-full rounded-2xl px-4 py-3 text-sm"
                placeholder="Your name"
              />
            </div>

            <div>
              <label htmlFor="contact-email" className="mb-2 block text-xs font-bold uppercase tracking-[0.3em] text-white/50">
                Email
              </label>
              <input
                id="contact-email"
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                className="vaultic-input w-full rounded-2xl px-4 py-3 text-sm"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="contact-message" className="mb-2 block text-xs font-bold uppercase tracking-[0.3em] text-white/50">
                Message
              </label>
              <textarea
                id="contact-message"
                required
                rows={5}
                value={form.message}
                onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
                className="vaultic-input w-full resize-none rounded-2xl px-4 py-3 text-sm"
                placeholder="How can we help?"
              />
            </div>
          </div>

          {status === "success" && (
            <div className="vaultic-alert-success mt-5 rounded-2xl border px-4 py-4 text-sm">
              <p className="flex items-center gap-2 font-semibold">
                <CheckCircle2 size={16} />
                Message sent successfully.
              </p>
              <p className="mt-2 leading-7 text-white/80">
                A confirmation email has been sent to <strong className="text-white">{confirmedEmail}</strong>. Check your inbox (and spam folder) — our team will reply there soon.
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="vaultic-alert-error mt-5 rounded-2xl border px-4 py-3 text-sm">
              <p>{errorMessage}</p>
            </div>
          )}

          <p className="mt-4 text-xs leading-6 text-white/45">
            By submitting, your message is emailed to Vaultic support and a confirmation copy is sent to you — no external mail app required.
          </p>

          <button
            type="submit"
            disabled={status === "loading" || status === "success"}
            className="vaultic-btn-primary mt-5 w-full rounded-full px-6 py-4 text-sm uppercase tracking-[0.2em] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "loading" ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Sending your message…
              </span>
            ) : status === "success" ? (
              "Message sent"
            ) : (
              "Send message"
            )}
          </button>
        </form>
      </div>
    </section>
  );
};
