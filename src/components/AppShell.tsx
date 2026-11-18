'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, History, Target, User, type LucideIcon } from 'lucide-react';

const TABS: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: '/practice', label: 'Practice', Icon: Target },
  { href: '/history', label: 'History', Icon: History },
  { href: '/metrics', label: 'Metrics', Icon: BarChart3 },
  { href: '/account', label: 'Account', Icon: User },
];

/** Fixed bottom tab bar; content scrolls above it. */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-dvh flex flex-col pb-[calc(56px+env(safe-area-inset-bottom))]">
      <main className="flex-1">{children}</main>
      <nav
        className="fixed bottom-0 inset-x-0 z-40 bg-white/85 backdrop-blur-md border-t border-slate-200"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <ul className="flex max-w-xl mx-auto">
          {TABS.map(({ href, label, Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  className={`h-14 flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${active ? 'text-indigo-600' : 'text-slate-500'}`}
                >
                  <Icon size={22} strokeWidth={active ? 2.4 : 1.8} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
