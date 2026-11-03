import { useDeferredValue, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Download,
  Eye,
  Filter,
  LoaderCircle,
  Plus,
  Printer,
  ReceiptText,
  Search,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from '../db/database';
import type { Category, Expense } from '../db/types';
import { PageHeader } from '../components/ui/PageHeader';
import { DateInput } from '../components/ui/DateInput';
import { EmptyState } from '../components/ui/EmptyState';
import { VoucherDocument } from '../components/vouchers/VoucherDocument';
import { useExpenseEditor } from '../components/expenses/ExpenseEditor';
import { useProfile } from '../providers/ProfileProvider';
import { useToast } from '../providers/ToastProvider';
import { formatCurrency, formatNumber, truncate } from '../lib/format';
import { formatDateBn } from '../lib/dates';
import { isNativeApp } from '../lib/native';
import { downloadBatchVoucherPdf } from '../lib/pdf';

function filterVouchers(
  expenses: Expense[],
  categoryMap: Map<string, Category>,
  search: string,
  categoryId: string,
  fromDate: string,
  toDate: string,
): Expense[] {
  const needle = search.trim().toLocaleLowerCase('bn');
  return expenses.filter((expense) => {
    if (categoryId && expense.categoryId !== categoryId) return false;
    if (fromDate && expense.date < fromDate) return false;
    if (toDate && expense.date > toDate) return false;
    if (!needle) return true;
    return `${expense.description} ${categoryMap.get(expense.categoryId)?.name ?? ''}`
      .toLocaleLowerCase('bn')
      .includes(needle);
  });
}

export function VouchersPage() {
  const data = useLiveQuery(async () => {
    const [expenses, categories] = await Promise.all([
      db.expenses.toArray(),
      db.categories.toArray(),
    ]);
    return { expenses, categories };
  }, []);
  const { openCreate } = useExpenseEditor();
  const { user } = useProfile();
  const toast = useToast();
  const native = isNativeApp();
  const batchNodes = useRef(new Map<string, HTMLDivElement>());
  const [batchBusy, setBatchBusy] = useState(false);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [categoryId, setCategoryId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const hasFilters = Boolean(search || categoryId || fromDate || toDate);

  const categoryMap = useMemo(
    () => new Map((data?.categories ?? []).map((category) => [category.id, category])),
    [data?.categories],
  );

  const filtered = useMemo(() => {
    if (!data) return [];
    return filterVouchers(
      data.expenses,
      categoryMap,
      deferredSearch,
      categoryId,
      fromDate,
      toDate,
    ).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }, [data, categoryMap, deferredSearch, categoryId, fromDate, toDate]);

  const total = filtered.reduce((sum, expense) => sum + expense.totalAmount, 0);
  const normalExpenses = filtered.filter((expense) => !expense.travelDetails);
  const sortedCategories = [...(data?.categories ?? [])].sort(
    (a, b) => Number(a.archived) - Number(b.archived) || a.name.localeCompare(b.name, 'bn'),
  );

  const handleBatchDownload = async () => {
    const elements = normalExpenses
      .map((expense) => batchNodes.current.get(expense.id))
      .filter((element): element is HTMLDivElement => Boolean(element));
    if (elements.length === 0) {
      toast.toast('PDF তৈরির জন্য কোনো সাধারণ ভাউচার নেই।', 'info');
      return;
    }
    setBatchBusy(true);
    try {
      const delivery = await downloadBatchVoucherPdf(elements, {
        filename: `MyVoucher-All-Vouchers-${new Date().toISOString().slice(0, 10)}.pdf`,
        dialogTitle: 'সব ভাউচারের PDF সংরক্ষণ বা শেয়ার করুন',
      });
      toast.success(
        delivery === 'saved'
          ? 'PDF ফোনের Documents/MyVoucher ফোল্ডারে সংরক্ষিত হয়েছে।'
          : delivery === 'shared'
            ? 'PDF তৈরি হয়েছে। সংরক্ষণ বা শেয়ার করার অ্যাপ বেছে নিন।'
            : 'প্রতি A4 পাতায় দুটি আলাদা ভাউচারসহ PDF ডাউনলোড হয়েছে।',
      );
    } catch (error) {
      console.error(error);
      toast.error('ভাউচারগুলোর PDF তৈরি করা যায়নি। আবার চেষ্টা করুন।');
    } finally {
      setBatchBusy(false);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setCategoryId('');
    setFromDate('');
    setToDate('');
  };

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="ভাউচার"
        title="ভাউচার তালিকা"
        description="প্রতিটি খরচ থেকেই তৈরি হয় একটি আলাদা A5 ভাউচার। “সব ভাউচার PDF” নিলে প্রতি A4 পাতায় দুটি আলাদা ভাউচার পাশাপাশি বসে।"
        actions={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => void handleBatchDownload()}
              disabled={batchBusy || normalExpenses.length === 0}
            >
              {batchBusy ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
              {batchBusy ? 'PDF তৈরি হচ্ছে…' : 'সব ভাউচার PDF'}
            </button>
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              <Plus size={17} /> নতুন খরচ
            </button>
          </>
        }
      />

      <section className="card overflow-hidden">
        <div className="border-b border-line p-3.5 sm:p-4">
          <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.5fr)_minmax(160px,1fr)_150px_150px_auto]">
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                type="search"
                className="field pl-9"
                placeholder="বিবরণ বা খাত খুঁজুন…"
                aria-label="ভাউচার খুঁজুন"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="relative">
              <Filter
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <select
                className="field cursor-pointer pl-9"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                aria-label="খাত অনুযায়ী ফিল্টার"
              >
                <option value="">সব খাত</option>
                {sortedCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                    {category.archived ? ' (সংরক্ষিত)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <DateInput
              value={fromDate}
              onChange={setFromDate}
              ariaLabel="শুরুর তারিখ"
              clearable
              className="[&_.date-field-label]:text-[12.5px]"
            />
            <DateInput
              value={toDate}
              onChange={setToDate}
              ariaLabel="শেষ তারিখ"
              clearable
              className="[&_.date-field-label]:text-[12.5px]"
            />
            {hasFilters && (
              <button type="button" onClick={clearFilters} className="btn btn-secondary">
                <X size={15} /> মুছুন
              </button>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-muted">
            <span>
              <span className="font-semibold text-ink">{formatNumber(filtered.length)}</span>টি
              ভাউচার
            </span>
            <span>
              মোট:{' '}
              <span className="money font-semibold text-ink">{formatCurrency(total)}</span>
            </span>
          </div>
        </div>

        {data === undefined ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="skeleton h-14 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<ReceiptText size={25} />}
            title={data.expenses.length === 0 ? 'ভাউচার তৈরি করার মতো খরচ নেই' : 'কোনো ভাউচার মেলেনি'}
            description={
              data.expenses.length === 0
                ? 'একটি খরচ যোগ করলেই তা থেকে A5 ভাউচার প্রিভিউ, PDF ও প্রিন্ট করা যাবে।'
                : 'ফিল্টার বদলে আবার খুঁজে দেখুন।'
            }
            action={
              data.expenses.length === 0 ? (
                <button type="button" className="btn btn-primary" onClick={openCreate}>
                  <Plus size={16} /> প্রথম খরচ যোগ করুন
                </button>
              ) : (
                <button type="button" className="btn btn-secondary" onClick={clearFilters}>
                  ফিল্টার মুছুন
                </button>
              )
            }
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[820px] border-collapse text-left">
                <thead>
                  <tr className="table-head">
                    <th scope="col" className="px-4 py-2.5 font-bold">তারিখ</th>
                    <th scope="col" className="px-4 py-2.5 font-bold">খাত</th>
                    <th scope="col" className="px-4 py-2.5 font-bold">বিবরণ</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-bold">মোট টাকা</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-bold">ভাউচার</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filtered.map((expense) => {
                    const categoryName = categoryMap.get(expense.categoryId)?.name ?? 'অন্যান্য';
                    return (
                      <tr key={expense.id} className="bg-surface transition-colors hover:bg-raised/30">
                        <td className="whitespace-nowrap px-4 py-3 text-[12.5px]">
                          {formatDateBn(expense.date)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="chip border-primary/15 bg-primary-soft/70 text-primary">
                            {categoryName}
                          </span>
                        </td>
                        <td className="max-w-[320px] px-4 py-3 text-[13px]">
                          <span className="block truncate" title={expense.description}>
                            {truncate(expense.description, 80)}
                          </span>
                        </td>
                        <td className="money whitespace-nowrap px-4 py-3 text-right text-[13px] font-semibold">
                          {formatCurrency(expense.totalAmount)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              to={`/vouchers/${expense.id}`}
                              className="icon-btn"
                              title="ভাউচার দেখুন"
                              aria-label={`${expense.description} — ভাউচার দেখুন`}
                            >
                              <Eye size={16} />
                            </Link>
                            <Link
                              to={`/vouchers/${expense.id}?action=pdf`}
                              className="icon-btn"
                              title="PDF ডাউনলোড"
                              aria-label={`${expense.description} — PDF ডাউনলোড`}
                            >
                              <Download size={16} />
                            </Link>
                            {!native && (
                              <Link
                                to={`/vouchers/${expense.id}?action=print`}
                                className="icon-btn"
                                title="প্রিন্ট"
                                aria-label={`${expense.description} — প্রিন্ট`}
                              >
                                <Printer size={16} />
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-line md:hidden">
              {filtered.map((expense) => {
                const categoryName = categoryMap.get(expense.categoryId)?.name ?? 'অন্যান্য';
                return (
                  <article key={expense.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="chip">{formatDateBn(expense.date)}</span>
                          <span className="chip border-primary/15 bg-primary-soft/70 text-primary">
                            {categoryName}
                          </span>
                        </div>
                        <p className="mt-2 text-[13px] font-medium leading-6">
                          {truncate(expense.description, 100)}
                        </p>
                      </div>
                      <p className="money shrink-0 text-[13px] font-semibold">
                        {formatCurrency(expense.totalAmount)}
                      </p>
                    </div>
                    <div className={`mt-3 grid gap-1.5 ${native ? 'grid-cols-2' : 'grid-cols-3'}`}>
                      <Link to={`/vouchers/${expense.id}`} className="btn btn-secondary h-8 min-h-0 text-[11px]">
                        <Eye size={13} /> দেখুন
                      </Link>
                      <Link
                        to={`/vouchers/${expense.id}?action=pdf`}
                        className="btn btn-secondary h-8 min-h-0 text-[11px]"
                      >
                        <Download size={13} /> PDF
                      </Link>
                      {!native && (
                        <Link
                          to={`/vouchers/${expense.id}?action=print`}
                          className="btn btn-secondary h-8 min-h-0 text-[11px]"
                        >
                          <Printer size={13} /> প্রিন্ট
                        </Link>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>

      <p className="mt-3 rounded-lg border border-line/70 bg-surface/50 px-4 py-3 text-[11px] leading-6 text-muted">
        <span className="font-semibold text-ink">নোট:</span> ভাউচার আলাদা করে সংরক্ষণ করা হয় না।
        খরচ সম্পাদনা করলে তার ভাউচার প্রিভিউও হালনাগাদ তথ্য দেখায়।
      </p>

      <div className="pdf-render-wrap pdf-only" aria-hidden="true">
        {normalExpenses.map((expense) => (
          <div
            key={expense.id}
            style={{ width: 'max-content' }}
            ref={(node) => {
              if (node) batchNodes.current.set(expense.id, node);
              else batchNodes.current.delete(expense.id);
            }}
          >
            <VoucherDocument
              expense={expense}
              categoryName={categoryMap.get(expense.categoryId)?.name ?? 'অন্যান্য'}
              userName={user?.name ?? 'ব্যবহারকারী'}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
