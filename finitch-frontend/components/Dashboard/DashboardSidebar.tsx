"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { DASHBOARD_NAV_LINKS, isDashboardNavActive } from '@/lib/routes';

function NavItem({ icon, label, active = false }: { readonly icon: React.ReactNode, readonly label: string, readonly active?: boolean }) {
    return (
        <div className={`flex w-full items-center gap-4 rounded-2xl border border-transparent px-4 py-4 transition-all ${active ? 'bg-vaultic-orange/10 text-vaultic-orange border-vaultic-orange/20 shadow-[0_18px_40px_-28px_rgba(var(--accent-rgb),0.9)]' : 'text-vaultic-muted hover:text-vaultic-cream hover:bg-vaultic-surface/70 hover:border-vaultic-border'}`}>
            <div className={`${active ? 'text-vaultic-orange' : 'text-vaultic-muted group-hover:text-vaultic-orange'} transition-all`}>{icon}</div>
            <span className="font-black text-[11px] uppercase tracking-[0.2em]">{label}</span>
        </div>
    );
}

interface DashboardSidebarProps {
    currentStreak: number;
    streakStatus: string;
}

export default function DashboardSidebar({ currentStreak, streakStatus }: DashboardSidebarProps) {
    const pathname = usePathname() ?? '';
    const links = DASHBOARD_NAV_LINKS.map(({ href, label, icon: Icon }) => ({
        href,
        label,
        icon: <Icon size={18} />,
    }));

    return (
        <aside className="hidden lg:flex sticky top-24 self-start w-full max-w-[300px] min-w-[300px] max-h-[calc(100vh-5.5rem)] overflow-y-auto pr-2 rounded-[2rem] border border-vaultic-border bg-vaultic-charcoal/90 p-6 xl:p-8 flex-col gap-8 shadow-[0_30px_120px_-90px_rgba(0,0,0,0.85)] backdrop-blur-md">
            <div className="flex items-center gap-3 border-b border-vaultic-border pb-5">
                <Image src="/logo.svg" alt="Vaultic logo" width={36} height={36} style={{ width: 'auto', height: 'auto' }} />
            </div>
            <nav className="flex flex-col gap-3">
                {links.map(({ href, label, icon }) => {
                    const active = isDashboardNavActive(pathname, href);
                    return (
                        <Link key={href} href={href}>
                            <NavItem icon={icon} label={label} active={active} />
                        </Link>
                    );
                })}
            </nav>
            <div className="mt-auto rounded-[2rem] border border-vaultic-orange/20 bg-vaultic-black/70 p-6 text-center">
                <p className="text-[9px] uppercase tracking-[0.35em] text-vaultic-orange mb-3">Discipline Lock</p>
                <h2 className="text-3xl font-black text-vaultic-cream">{currentStreak} DAYS</h2>
                <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-vaultic-muted">{streakStatus}</p>
            </div>
        </aside>
    );
}