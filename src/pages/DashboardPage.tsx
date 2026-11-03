import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  HandCoins,
  Plus,
  ReceiptText,
  Table2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from '../db/database';
import { useProfile } from '../providers/ProfileProvider';
import { useExpenseEditor } from '../components/expenses/ExpenseEditor';
import { StatCard } from '../components/ui/StatCard';
import { EmptyState } from '../components/ui/EmptyState';
import { formatCurrency, formatNumber, formatPercent } from '../lib/format';
import {
  currentMonthKey,
  formatDateBn,
  formatLongDateBn,
  monthLabelBn,
} from '../lib/dates';

const CHART_COLORS = ['#0F5A48', '#B16530', '#60784A', '#8A5A6D', '#3E6C84', '#7A6E49'];

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'শুভ সকাল';
  if (hour < 16) return 'শুভ দুপুর';
  if (hour < 19) return 'শুভ বিকেল';
  return 'শুভ সন্ধ্যা';
}

export function DashboardPage() {
  const { user } = useProfile();
  const { openCreate } = useExpenseEditor();
  const data = useLiveQuery(async () => {
    const [expenses, categories] = await Promise.all([
      db.expenses.toArray(),
      db.categories.toArray(),
    ]);
    return { expenses, categories };
  }, []);

  const stats = useMemo(() => {
    if (!data) return null;
    const { expenses, categories } = data;
    const categoryMap = new Map(categories.map((category) => [category.id, category]));
    const total = expenses.reduce((sum, expense) => sum + expense.totalAmount, 0);
    const monthKey = currentMonthKey();
    const monthly = expenses
      .filter((expense) => expense.date.startsWith(monthKey))
      .reduce((sum, expense) => sum + expense.totalAmount, 0);

    const byCategory = new Map<string, number>();
    for (const expense of expenses) {
      byCategory.set(
        expense.categoryId,
        (byCategory.get(expense.categoryId) ?? 0) + expense.totalAmount,
      );
    }
    const categoryRows = Array.from(byCategory.entries())
      .map(([categoryId, amount]) => ({
        id: categoryId,
        name: categoryMap.get(categoryId)?.name ?? 'অজানা খাত',
        archived: categoryMap.get(categoryId)?.archived ?? false,
        amount,
        percent: total > 0 ? (amount / total) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const recent = [...expenses]
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
      .slice(0, 6)
      .map((expense) => ({
        ...expense,
        categoryName: categoryMap.get(expense.categoryId)?.name ?? 'অজানা খাত',
      }));

    return {
      total,
      monthly,
      count: expenses.length,
      categories: categoryRows,
      recent,
      monthKey,
    };
  }, [data]);

  const loading = data === undefined || stats === null;

  return (
    <div className="animate-fade-up">
      <div className="mb-6 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="overline mb-1.5">ড্যাশবোর্ড</p>
          <h1 className="page-title">
            {greeting()}, {user?.name?.split(' ')[0] ?? 'ব্যবহারকারী'}
          </h1>
          <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-muted">
            <CalendarDays size={14} />
            {formatLongDateBn()}
          </p>
        </div>
        <button type="button" className="btn btn-primary self-start sm:self-auto" onClick={openCreate}>
          <Plus size={17} />
          নতুন খরচ
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="card h-[122px] p-5">
              <div className="skeleton h-3 w-20" />
              <div className="skeleton mt-4 h-7 w-28" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="মোট খরচ"
            value={formatCurrency(stats.total)}
            meta={`${formatNumber(stats.count)}টি এন্ট্রি থেকে`}
            icon={HandCoins}
          />
          <StatCard
            label="মোট খরচের এন্ট্রি"
            value={`${formatNumber(stats.count)}টি`}
            meta="সব সময়ের হিসাব"
            icon={Table2}
            tone="neutral"
          />
          <StatCard
            label="মোট ভাউচার"
            value={`${formatNumber(stats.count)}টি`}
            meta="প্রতিটি খরচ থেকে প্রস্তুতযোগ্য"
            icon={ReceiptText}
            tone="accent"
          />
          <StatCard
            label="এই মাসের খরচ"
            value={formatCurrency(stats.monthly)}
            meta={monthLabelBn(stats.monthKey)}
            icon={CalendarDays}
          />
        </div>
      )}

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.04fr_.96fr]">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div>
              <h2 className="section-title">খাতভিত্তিক খরচ</h2>
              <p className="mt-0.5 text-[11.5px] text-muted">মোট খরচের অনুপাত</p>
            </div>
            <Link to="/categories" className="text-[12px] font-semibold text-primary hover:underline">
              খাত দেখুন
            </Link>
          </div>
          {loading ? (
            <div className="space-y-5 p-5">
              {[0, 1, 2].map((item) => (
                <div key={item}>
                  <div className="skeleton h-3 w-24" />
                  <div className="skeleton mt-2 h-2 w-full" />
                </div>
              ))}
            </div>
          ) : stats.categories.length === 0 ? (
            <EmptyState
              compact
              icon={<HandCoins size={24} />}
              title="এখনো কোনো খরচ নেই"
              description="প্রথম খরচ যোগ করলে খাতভিত্তিক হিসাব এখানে দেখা যাবে।"
              action={
                <button type="button" className="btn btn-primary" onClick={openCreate}>
                  <Plus size={16} /> প্রথম খরচ যোগ করুন
                </button>
              }
            />
          ) : (
            <div className="p-5">
              <div className="space-y-5">
                {stats.categories.map((category, index) => (
                  <div key={category.id}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: CHART_COLORS[index % CHART_COLORS.length] }}
                        />
                        <span className="truncate text-[13px] font-medium text-ink">
                          {category.name}
                          {category.archived && (
                            <span className="ml-1.5 text-[10px] text-muted">(সংরক্ষিত)</span>
                          )}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-baseline gap-2.5">
                        <span className="text-[11px] tabular-nums text-muted">
                          {formatPercent(category.percent)}
                        </span>
                        <span className="money text-[13px] font-semibold text-ink">
                          {formatCurrency(category.amount)}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-raised">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(category.percent, 1.5)}%`,
                          background: CHART_COLORS[index % CHART_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-line pt-4 text-xs">
                <span className="text-muted">{formatNumber(stats.categories.length)}টি সক্রিয় খাতে ব্যয়</span>
                <span className="money font-semibold text-ink">{formatCurrency(stats.total)}</span>
              </div>
            </div>
          )}
        </section>

        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div>
              <h2 className="section-title">সাম্প্রতিক খরচ</h2>
              <p className="mt-0.5 text-[11.5px] text-muted">সর্বশেষ সংরক্ষিত এন্ট্রি</p>
            </div>
            <Link to="/expenses" className="flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline">
              সব দেখুন <ArrowRight size={13} />
            </Link>
          </div>
          {loading ? (
            <div className="divide-y divide-line">
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="flex items-center gap-3 p-4">
                  <div className="skeleton h-9 w-9 rounded-lg" />
                  <div className="flex-1">
                    <div className="skeleton h-3 w-32" />
                    <div className="skeleton mt-2 h-2.5 w-20" />
                  </div>
                  <div className="skeleton h-4 w-16" />
                </div>
              ))}
            </div>
          ) : stats.recent.length === 0 ? (
            <EmptyState
              compact
              icon={<ReceiptText size={24} />}
              title="সাম্প্রতিক কিছু নেই"
              description="আপনার নতুন খরচগুলো এখানে সময় অনুযায়ী দেখা যাবে।"
            />
          ) : (
            <div>
              <ul className="divide-y divide-line">
                {stats.recent.map((expense) => (
                  <li key={expense.id}>
                    <Link
                      to={`/vouchers/${expense.id}`}
                      className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-raised/40"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-[12px] font-bold text-primary">
                        {expense.categoryName.slice(0, 1)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-ink">
                          {expense.description}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-muted">
                          {expense.categoryName} · {formatDateBn(expense.date)}
                        </span>
                      </span>
                      <span className="money shrink-0 text-[13px] font-semibold text-ink">
                        {formatCurrency(expense.totalAmount)}
                      </span>
                      <ArrowUpRight
                        size={14}
                        className="shrink-0 text-muted/40 transition-colors group-hover:text-primary"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="border-t border-line bg-raised/25 px-5 py-3.5">
                <button
                  type="button"
                  onClick={openCreate}
                  className="flex w-full items-center justify-center gap-1.5 text-[12px] font-semibold text-primary hover:underline"
                >
                  <Plus size={14} /> আরেকটি খরচ যোগ করুন
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="mt-5 rounded-xl2 border border-line bg-primary-soft/45 px-5 py-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12.5px] leading-6 text-muted">
            <span className="font-semibold text-ink">মনে রাখবেন:</span> আপনার সব তথ্য এই ডিভাইসের
            IndexedDB-তে সংরক্ষিত। নিয়মিত ব্যাকআপ নিলে ডেটা হারানোর ঝুঁকি কমে।
          </p>
          <Link
            to="/settings#backup"
            className="shrink-0 text-[12px] font-semibold text-primary hover:underline"
          >
            ব্যাকআপ নিন →
          </Link>
        </div>
      </section>
    </div>
  );
}
