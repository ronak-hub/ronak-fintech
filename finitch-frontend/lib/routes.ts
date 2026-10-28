import type { LucideIcon } from 'lucide-react';
import { Activity, BarChart, Bell, LayoutDashboard, TrendingUp } from 'lucide-react';

export const PUBLIC_ROUTES = ['/', '/login'];

export const DASHBOARD_NAV_LINKS: Array<{
  href: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}> = [
  { href: '/dashboard', label: 'Overview', shortLabel: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/freedom', label: 'Freedom Path', shortLabel: 'Freedom', icon: TrendingUp },
  { href: '/dashboard/audit', label: 'Wealth Audit', shortLabel: 'Audit', icon: Activity },
  { href: '/dashboard/leaks', label: 'Neural Leaks', shortLabel: 'Leaks', icon: Bell },
  { href: '/dashboard/core', label: 'CORE', shortLabel: 'CORE', icon: BarChart },
];

export function isProtectedRoute(pathname: string): boolean {
  return pathname === '/dashboard' || pathname.startsWith('/dashboard/');
}

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.includes(pathname) || pathname.startsWith('/api/') || pathname.startsWith('/_next/');
}

export function shouldShowNavbar(pathname: string): boolean {
  return PUBLIC_ROUTES.includes(pathname) || pathname.startsWith('/dashboard');
}

export function isDashboardNavActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') {
    return pathname === '/dashboard' || pathname === '/dashboard/';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
