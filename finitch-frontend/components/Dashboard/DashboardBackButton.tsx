import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface DashboardBackButtonProps {
  readonly label?: string;
  readonly href?: string;
}

export default function DashboardBackButton({
  label = 'Back to Control Center',
  href = '/dashboard',
}: DashboardBackButtonProps) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-full border border-vaultic-orange/30 bg-vaultic-orange/10 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-vaultic-orange transition duration-200 hover:bg-vaultic-orange/20 vaultic-hot-button"
    >
      <ArrowLeft size={14} aria-hidden="true" />
      {label}
    </Link>
  );
}
