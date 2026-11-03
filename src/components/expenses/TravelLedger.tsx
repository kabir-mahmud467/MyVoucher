import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Bus,
  CalendarDays,
  Pencil,
  Plus,
  ReceiptText,
  Users,
  Wallet,
} from 'lucide-react';
import type { Expense } from '../../db/types';
import { useExpenseEditor } from './ExpenseEditor';
import { EmptyState } from '../ui/EmptyState';
import { formatCurrency, formatNumber } from '../../lib/format';
import { formatDateBn, formatVoucherDate } from '../../lib/dates';

interface TravelGroup {
  date: string;
  expenses: Expense[];
  total: number;
  passengers: number;
}

export function TravelLedger({
  expenses,
  loading,
}: {
  expenses: Expense[];
  loading: boolean;
}) {
  const { openCreate, openEdit } = useExpenseEditor();

  const groups = useMemo<TravelGroup[]>(() => {
    const map = new Map<string, Expense[]>();
    for (const expense of expenses) {
      if (!expense.travelDetails) continue;
      const list = map.get(expense.date);
      if (list) list.push(expense);
      else map.set(expense.date, [expense]);
    }

    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, groupExpenses]) => ({
        date,
        expenses: [...groupExpenses].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
        total: groupExpenses.reduce((sum, expense) => sum + expense.totalAmount, 0),
        passengers: groupExpenses.reduce(
          (sum, expense) => sum + (expense.travelDetails?.passengers ?? 0),
          0,
        ),
      }));
  }, [expenses]);

  const overall = useMemo(
    () => ({
      trips: groups.reduce((sum, group) => sum + group.expenses.length, 0),
      passengers: groups.reduce((sum, group) => sum + group.passengers, 0),
      total: groups.reduce((sum, group) => sum + group.total, 0),
      days: groups.length,
    }),
    [groups],
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <CalendarDays size={18} />
          </span>
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-muted">তারিখ</p>
            <p className="font-display text-lg font-bold text-ink">{formatNumber(overall.days)}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Bus size={18} />
          </span>
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-muted">যাত্রা</p>
            <p className="font-display text-lg font-bold text-ink">{formatNumber(overall.trips)}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Users size={18} />
          </span>
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-muted">যাত্রী</p>
            <p className="font-display text-lg font-bold text-ink">
              {formatNumber(overall.passengers)}
            </p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <Wallet size={18} />
          </span>
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-muted">মোট ব্যয়</p>
            <p className="money font-display text-lg font-bold text-ink">
              {formatCurrency(overall.total)}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((item) => (
            <div key={item} className="skeleton h-40 w-full" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={<Bus size={25} />}
          title="এখনো কোনো যাতায়াত খরচ নেই"
          description="খাত হিসেবে “যাতায়াত” বেছে নিয়ে খরচ যোগ করুন। তারপর সব যাত্রা তারিখ অনুযায়ী এখানে দেখা যাবে।"
          action={
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              <Plus size={16} /> প্রথম যাতায়াত খরচ যোগ করুন
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <section key={group.date} className="card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <CalendarDays size={16} />
                  </span>
                  <div>
                    <p className="text-[13.5px] font-bold text-ink">{formatDateBn(group.date)}</p>
                    <p className="text-[10.5px] text-muted">
                      {formatNumber(group.expenses.length)}টি যাত্রা ·{' '}
                      {formatNumber(group.passengers)} জন যাত্রী
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className="money text-[13px] font-semibold text-ink">
                    মোট: {formatCurrency(group.total)}
                  </p>
                  <Link
                    to={`/vouchers/${group.expenses[0].id}`}
                    className="btn btn-secondary h-8 min-h-0 text-[11px]"
                  >
                    <ReceiptText size={13} /> ভাউচার
                  </Link>
                </div>
              </div>

              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[940px] border-collapse text-left">
                  <thead>
                    <tr className="table-head">
                      <th scope="col" className="px-3 py-2.5 font-bold">তারিখ</th>
                      <th scope="col" className="px-3 py-2.5 font-bold">কোথা থেকে</th>
                      <th scope="col" className="px-3 py-2.5 font-bold">কোথায়</th>
                      <th scope="col" className="px-3 py-2.5 text-center font-bold">কতজন</th>
                      <th scope="col" className="px-3 py-2.5 text-right font-bold">পরিমাণ</th>
                      <th scope="col" className="px-3 py-2.5 font-bold">মাধ্যম</th>
                      <th scope="col" className="px-3 py-2.5 font-bold">উদ্দেশ্য</th>
                      <th scope="col" className="px-3 py-2.5 text-right font-bold">মোট টাকা</th>
                      <th scope="col" className="px-3 py-2.5 text-right font-bold">কার্য</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {group.expenses.map((expense) => {
                      const details = expense.travelDetails;
                      const perPerson =
                        expense.unitPrice ??
                        (details && details.passengers > 0
                          ? expense.totalAmount / details.passengers
                          : expense.totalAmount);
                      return (
                        <tr key={expense.id} className="bg-surface hover:bg-raised/30">
                          <td className="whitespace-nowrap px-3 py-2.5 text-[12px]">
                            {formatVoucherDate(expense.date)}
                          </td>
                          <td className="px-3 py-2.5 text-[12.5px] font-medium text-ink">
                            {details?.from ?? '—'}
                          </td>
                          <td className="px-3 py-2.5 text-[12.5px] text-ink">
                            {details?.to ?? '—'}
                          </td>
                          <td className="px-3 py-2.5 text-center text-[12.5px] tabular-nums">
                            {formatNumber(details?.passengers ?? expense.quantity)}
                          </td>
                          <td className="money whitespace-nowrap px-3 py-2.5 text-right text-[12.5px] tabular-nums">
                            {formatCurrency(perPerson)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-[12px] text-muted">
                            {details?.mode ?? '—'}
                          </td>
                          <td className="max-w-[240px] px-3 py-2.5 text-[12px] text-muted">
                            <span className="block truncate" title={details?.purpose ?? ''}>
                              {details?.purpose ?? '—'}
                            </span>
                          </td>
                          <td className="money whitespace-nowrap px-3 py-2.5 text-right text-[12.5px] font-semibold tabular-nums">
                            {formatCurrency(expense.totalAmount)}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center justify-end gap-1">
                              <Link
                                to={`/vouchers/${expense.id}`}
                                className="icon-btn h-7 w-7"
                                title="ভাউচার দেখুন"
                                aria-label={`${details?.from ?? ''} থেকে ${details?.to ?? ''} — ভাউচার`}
                              >
                                <ReceiptText size={14} />
                              </Link>
                              <button
                                type="button"
                                className="icon-btn h-7 w-7"
                                onClick={() => openEdit(expense)}
                                title="সম্পূর্ণ সম্পাদনা"
                                aria-label={`${details?.from ?? ''} থেকে ${details?.to ?? ''} — সম্পাদনা`}
                              >
                                <Pencil size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-line bg-raised/35">
                      <td colSpan={7} className="px-3 py-2.5 text-[11.5px] font-semibold text-muted">
                        {formatDateBn(group.date)} তারিখের সর্বমোট
                      </td>
                      <td className="money px-3 py-2.5 text-right text-[13px] font-bold text-ink">
                        {formatCurrency(group.total)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="rounded-lg border border-line/70 bg-surface/50 px-4 py-3 text-[11px] leading-6 text-muted">
        <span className="font-semibold text-ink">ভাউচার:</span> যেকোনো তারিখের “ভাউচার” চাপলে সব
        তারিখের সব যাতায়াত একটি A4 পোর্ট্রেট ভাউচারে পরপর সারি হিসেবে একসঙ্গে দেখা যাবে এবং PDF বা
        প্রিন্ট করা যাবে।
      </p>
    </div>
  );
}
