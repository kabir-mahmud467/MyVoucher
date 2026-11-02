import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeftRight,
  LayoutDashboard,
  ReceiptText,
  Settings,
  Table2,
  Tags,
} from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Brand } from '../ui/Logo';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useProfile } from '../../providers/ProfileProvider';
import { formatLongDateBn } from '../../lib/dates';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';

interface NavItem {
  to: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  end?: boolean;
}

const PRIMARY_NAV: NavItem[] = [
  { to: '/', label: 'ড্যাশবোর্ড', shortLabel: 'হোম', icon: LayoutDashboard, end: true },
  { to: '/expenses', label: 'খরচের হিসাব', shortLabel: 'খরচ', icon: Table2 },
  { to: '/vouchers', label: 'ভাউচার', shortLabel: 'ভাউচার', icon: ReceiptText },
  { to: '/categories', label: 'খাত ব্যবস্থাপনা', shortLabel: 'খাত', icon: Tags },
  { to: '/backup', label: 'ব্যাকআপ ও রিস্টোর', shortLabel: 'ব্যাকআপ', icon: ArrowLeftRight },
  { to: '/settings', label: 'সেটিংস', shortLabel: 'সেটিংস', icon: Settings },
];

function isNavActive(pathname: string, item: NavItem): boolean {
  if (item.end) return pathname === '/';
  if (item.to === '/vouchers') return pathname.startsWith('/vouchers');
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}

export function AppShell() {
  const { user } = useProfile();
  const location = useLocation();
  const { canInstall } = useInstallPrompt();
  const initial = user?.name.trim().charAt(0) ?? 'M';

  return (
    <div className="min-h-screen bg-canvas">
      <ScrollToTop />

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[256px] flex-col bg-sidebar text-sidebar-ink lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.055]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 31px, #fff 31px, #fff 32px)',
          }}
        />
        <div className="relative px-5 pb-6 pt-6">
          <Brand className="text-sidebar-ink" />
        </div>

        <nav className="relative flex-1 space-y-1 px-3" aria-label="প্রধান মেনু">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-sidebar-muted/70">
            হিসাবের খাতা
          </p>
          {PRIMARY_NAV.map((item) => {
            const active = isNavActive(location.pathname, item);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={`nav-link ${active ? 'nav-link-active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <item.icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          <div className="pt-4">
            <NavLink
              to="/install"
              className={`nav-link ${location.pathname === '/install' ? 'nav-link-active' : ''}`}
            >
              <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-sidebar-muted/50 text-[10px]">
                ↓
              </span>
              <span>অ্যাপ ইনস্টল</span>
              {canInstall && (
                <span className="ml-auto rounded-full bg-[#d9a069] px-1.5 py-0.5 text-[9px] font-bold text-[#12261f]">
                  নতুন
                </span>
              )}
            </NavLink>
          </div>
        </nav>

        <div className="relative border-t border-white/10 p-3.5">
          <div className="flex items-center gap-2">
            <NavLink
              to="/settings"
              className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-white/[0.06]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#d9a069] font-display text-sm font-bold text-[#12261f]">
                {initial}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold text-sidebar-ink">
                  {user?.name ?? 'ব্যবহারকারী'}
                </span>
                <span className="block text-[10px] text-sidebar-muted">ব্যক্তিগত প্রোফাইল</span>
              </span>
            </NavLink>
            <ThemeToggle />
          </div>
          <p className="mt-3 px-1 text-[9.5px] leading-relaxed text-sidebar-muted/60">
            সব তথ্য আপনার ডিভাইসেই সংরক্ষিত
          </p>
        </div>
      </aside>

      {/* Main area */}
      <div className="lg:pl-[256px]">
        <header className="sticky top-0 z-30 flex h-[60px] items-center justify-between border-b border-line bg-canvas/90 px-4 backdrop-blur-md sm:px-6 lg:h-[64px] lg:px-8">
          <div className="flex items-center gap-2 lg:hidden">
            <Brand compact to="/" className="text-ink" />
          </div>
          <div className="hidden items-center gap-2 lg:flex">
            <span className="text-[12px] font-medium text-muted">{formatLongDateBn()}</span>
            <span className="mx-1 h-4 w-px bg-line" aria-hidden="true" />
            <span className="text-[11px] text-muted">বাংলাদেশ সময়</span>
          </div>
          <div className="flex items-center gap-1">
            {canInstall && (
              <NavLink
                to="/install"
                className="mr-1 hidden items-center gap-1.5 rounded-full border border-primary/25 bg-primary-soft px-3 py-1.5 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/15 sm:flex"
              >
                <span aria-hidden="true">↓</span> অ্যাপ ইনস্টল
              </NavLink>
            )}
            <NavLink to="/settings" className="icon-btn lg:hidden" aria-label="সেটিংস">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-soft text-[11px] font-bold text-primary">
                {initial}
              </span>
            </NavLink>
            <div className="lg:hidden">
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] px-4 pb-28 pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pb-14 lg:pt-7">
          <Outlet />
        </main>
      </div>

      {/* Mobile navigation */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
        aria-label="মোবাইল মেনু"
      >
        <div className="grid grid-cols-6 px-1">
          {PRIMARY_NAV.map((item) => {
            const active = isNavActive(location.pathname, item);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={`flex min-h-[58px] flex-col items-center justify-center gap-1 px-0.5 pt-2 text-[9.5px] font-medium transition-colors ${
                  active ? 'text-primary' : 'text-muted hover:text-ink'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <span
                  className={`flex h-7 w-9 items-center justify-center rounded-lg ${
                    active ? 'bg-primary-soft' : ''
                  }`}
                >
                  <item.icon size={18} strokeWidth={active ? 2.3 : 1.8} />
                </span>
                <span className="truncate">{item.shortLabel}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
