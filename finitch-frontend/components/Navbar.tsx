"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearAuthToken, getAuthToken } from "@/lib/cookies";
import { shouldShowNavbar, DASHBOARD_NAV_LINKS } from "@/lib/routes";
import { LayoutDashboard, LogIn, LogOut, Home, Menu, X } from "lucide-react";

const landingLinks = [
  { href: "#features", label: "Features" },
  { href: "#demo", label: "Demo" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
  { href: "#contact", label: "Contact" },
];

export default function Navbar() {
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const hasSession = Boolean(getAuthToken());

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (!mounted) {
    return (
      <nav
        aria-hidden
        className="fixed left-0 right-0 top-0 z-50 h-16 w-full border-b border-white/10 bg-[#080B12]/95 backdrop-blur-xl"
      />
    );
  }

  const isLanding = pathname === "/" || pathname === "";
  const isLoginPage = pathname === "/login" || pathname === "/login/";
  const isDashboard = pathname.startsWith("/dashboard");
  const isMainDashboard = pathname === "/dashboard" || pathname === "/dashboard/";

  const handleLogout = () => {
    clearAuthToken();
    router.push("/login");
  };

  const openWizardStep1 = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("vaulticDnaInputsUpdated"));
    }
    router.push("/dashboard?wizardStep=1");
  };

  if (!shouldShowNavbar(pathname) || (!isLanding && !isLoginPage && !isDashboard)) {
    return null;
  }

  const dashboardLinks = DASHBOARD_NAV_LINKS.map(({ href, shortLabel, icon }) => ({
    href,
    label: shortLabel,
    icon,
  }));

  return (
    <>
      {isDashboard && (
        <nav
          role="navigation"
          aria-label="Dashboard mobile navigation"
          className="fixed left-0 right-0 top-0 z-50 w-full border-b border-vaultic-border bg-vaultic-black/92 backdrop-blur-md lg:hidden"
        >
          <div className="mx-auto flex h-12 max-w-7xl items-center gap-3 px-3 py-2">
            <Link href="/dashboard" className="flex h-10 w-10 shrink-0 items-center justify-center">
              <Image src="/logo.svg" alt="Vaultic" width={28} height={28} className="h-7 w-auto" />
            </Link>
            <div className="min-w-0 flex-grow overflow-x-auto">
              <div className="flex items-center gap-2">
                {dashboardLinks.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-xs font-semibold uppercase tracking-widest transition-colors ${
                        active
                          ? "bg-vaultic-orange/20 text-vaultic-orange"
                          : "text-vaultic-muted hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <Icon size={15} />
                      <span>{label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isMainDashboard && (
                <Link
                  href="/dashboard"
                  aria-label="Back to Control Center"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-vaultic-muted transition-colors hover:bg-white/10 hover:text-white"
                >
                  <LayoutDashboard size={18} />
                </Link>
              )}
              <button
                onClick={openWizardStep1}
                aria-label="Revisit inputs"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-vaultic-muted transition-colors hover:bg-white/10 hover:text-white"
              >
                <Home size={18} />
              </button>
              <button
                onClick={handleLogout}
                aria-label="Log Out"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-vaultic-muted transition-colors hover:bg-white/10 hover:text-white"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </nav>
      )}

      <nav
        role="navigation"
        aria-label="Main site navigation"
        className={`fixed left-0 right-0 top-0 z-50 w-full border-b border-white/10 bg-[#080B12]/90 backdrop-blur-xl ${
          isDashboard ? "hidden lg:block" : ""
        }`}
      >
        <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href={isDashboard ? "/dashboard" : "/#home"}
            className="flex items-center gap-2.5"
          >
            <Image
              src="/logo.svg"
              alt="Vaultic"
              width={36}
              height={36}
              className="h-8 w-auto object-contain"
            />
            <span className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight text-white">
              Vaultic
            </span>
          </Link>

          {isLanding && (
            <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1 md:flex">
              {landingLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-full px-3 py-2 text-sm font-medium text-white/65 transition hover:bg-white/5 hover:text-white"
                >
                  {label}
                </Link>
              ))}
            </div>
          )}

          {isDashboard && (
            <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 lg:flex">
              <div className="flex items-center justify-center gap-2">
                {dashboardLinks.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold uppercase tracking-widest transition-colors ${
                        active
                          ? "bg-vaultic-orange/20 text-vaultic-orange"
                          : "text-vaultic-muted hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <Icon size={15} />
                      <span>{label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 sm:gap-3">
            {isLanding &&
              (hasSession ? (
                <Link
                  href="/dashboard"
                  className="inline-flex h-10 items-center justify-center rounded-full bg-vaultic-orange px-5 text-sm font-semibold text-black transition hover:brightness-110"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="hidden h-10 items-center justify-center rounded-full px-4 text-sm font-medium text-white/80 transition hover:text-white sm:inline-flex"
                  >
                    Login
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-vaultic-orange px-5 text-sm font-semibold text-black shadow-[0_12px_40px_-12px_rgba(245,158,11,0.7)] transition hover:brightness-110"
                  >
                    <LogIn size={14} className="hidden sm:inline" />
                    Get Started
                  </Link>
                  <button
                    type="button"
                    aria-label={mobileOpen ? "Close menu" : "Open menu"}
                    aria-expanded={mobileOpen}
                    onClick={() => setMobileOpen((o) => !o)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white md:hidden"
                  >
                    {mobileOpen ? <X size={18} /> : <Menu size={18} />}
                  </button>
                </>
              ))}

            {isDashboard && (
              <>
                <button
                  onClick={openWizardStep1}
                  aria-label="Revisit inputs"
                  className="hidden h-10 w-10 items-center justify-center rounded-full text-vaultic-muted transition-colors hover:bg-white/10 hover:text-white md:inline-flex"
                >
                  <Home size={18} />
                </button>
                <button
                  onClick={handleLogout}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-vaultic-orange/30 bg-vaultic-orange/10 px-4 text-sm font-semibold text-vaultic-orange transition hover:bg-vaultic-orange/20"
                >
                  <LogOut size={14} className="hidden sm:inline" />
                  Log Out
                </button>
              </>
            )}

            {isLoginPage && (
              <Link
                href="/#home"
                className="inline-flex h-10 items-center justify-center rounded-full border border-white/15 px-4 text-sm font-medium text-white/80 transition hover:bg-white/5 hover:text-white"
              >
                Back to home
              </Link>
            )}
          </div>
        </div>

        {isLanding && mobileOpen && (
          <div className="border-t border-white/10 bg-[#080B12]/98 px-4 py-4 md:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-1">
              {landingLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-medium text-white/75 transition hover:bg-white/5 hover:text-white"
                >
                  {label}
                </Link>
              ))}
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="mt-2 rounded-xl bg-vaultic-orange px-4 py-3 text-center text-sm font-semibold text-black"
              >
                Login / Get Started
              </Link>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
