"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Navbar from "../components/Navbar";
import { getAuthToken } from "@/lib/cookies";
import { isProtectedRoute, shouldShowNavbar } from "@/lib/routes";

export default function ClientLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const router = useRouter();
  // client-only redirect logic will check runtime environment when needed

  const isWizardPreview = pathname.startsWith('/dashboard') && Boolean(searchParams?.get('wizardStep'));
  const showNavbar = shouldShowNavbar(pathname) && !isWizardPreview;

  useEffect(() => {
    // only run client-side
    if (typeof globalThis === 'undefined' || !globalThis.window) return;

    const token = getAuthToken();

    if (isProtectedRoute(pathname) && !token) {
      router.replace("/login");
      return;
    }

    if (pathname.startsWith("/login") && token) {
      router.replace("/dashboard");
    }
  }, [pathname, router]);

  return (
    <>
      {showNavbar && <Navbar />}
      <div className={showNavbar ? "pt-20 lg:pt-20" : "pt-0"}>{children}</div>
    </>
  );
}
