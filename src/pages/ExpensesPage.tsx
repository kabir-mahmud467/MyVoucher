import { useDeferredValue, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowDownUp, Filter, Plus, Search, Table2, X } from 'lucide-react';
import { db } from '../db/database';
import { deleteExpense } from '../db/expenseService';
import type { Category, Expense } from '../db/types';
import { useExpenseEditor } from '../components/expenses/ExpenseEditor';
import { ExpenseTableRow } from '../components/expenses/ExpenseTableRow';
import { PageHeader } from '../components/ui/PageHeader';
import { DateInput } from '../components/ui/DateInput';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../providers/ToastProvider';
import { formatCurrency, formatNumber } from '../lib/format';
import { formatDateBn } from '../lib/dates';

type SortKey = 'newest' | 'oldest' | 'amount-desc' | 'amount-asc';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'নতুন আগে' },
  { value: 'oldest', label: 'পুরোনো আগে' },
  { value: 'amount-desc', label: 'বেশি টাকা আগে' },
  { value: 'amount-asc', label: 'কম টাকা আগে' },
];

function filterExpenses(
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
    const categoryName = categoryMap.get(expense.categoryId)?.name ?? '';
    return `${expense.description} ${categoryName} ${expense.totalAmount} ${formatDateBn(
      expense.date,
    )}`
      .toLocaleLowerCase('bn')
      .includes(needle);
  });
}

export function ExpensesPage() {
  const data = useLiveQuery(async () => {
    const [expenses, categories] = await Promise.all([
      db.expenses.toArray(),
      db.categories.toArray(),
    ]);
    return { expenses, categories };
  }, []);
  const { openCreate, openEdit } = useExpenseEditor();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [categoryId, setCategoryId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);

  const categoryMap = useMemo(
    () => new Map((data?.categories ?? []).map((category) => [category.id, category])),
    [data?.categories],
  );

  const filtered = useMemo(() => {
    if (!data) return [];
    const result = filterExpenses(
      data.expenses,
      categoryMap,
      deferredSearch,
      categoryId,
      fromDate,
      toDate,
    );
    return result.sort((a, b) => {
      switch (sort) {
        case 'oldest':
          return a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt);
        case 'amount-desc':
          return b.totalAmount - a.totalAmount;
        case 'amount-asc':
          return a.totalAmount - b.totalAmount;
        default:
          return b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);
      }
    });
  }, [data, categoryMap, deferredSearch, categoryId, fromDate, toDate, sort]);

  const total = filtered.reduce((sum, expense) => sum + expense.totalAmount, 0);
  const hasFilters = Boolean(search || categoryId || fromDate || toDate);
  const loading = data === undefined;

  const clearFilters = () => {
    setSearch('');
    setCategoryId('');
    setFromDate('');
    setToDate('');
    setSort('newest');
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteExpense(deleteTarget.id);
      toast.success('খরচের রেকর্ডটি মুছে ফেলা হয়েছে।');
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'রেকর্ডটি মোছা যায়নি।');
    } finally {
      setDeleting(false);
    }
  };

  const sortedCategories = [...(data?.categories ?? [])].sort(
    (a, b) => Number(a.archived) - Number(b.archived) || a.name.localeCompare(b.name, 'bn'),
  );

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="খরচের হিসাব"
        title="খরচের খাতা"
        description="Excel-এর মতো ইনলাইন সম্পাদনা করুন। পরিবর্তন স্বয়ংক্রিয়ভাবে এই ডিভাইসে সংরক্ষিত হয়।"
        actions={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <Plus size={17} /> নতুন খরচ
          </button>
        }
      />

      <section className="card overflow-hidden">
        <div className="border-b border-line bg-surface p-3.5 sm:p-4">
          <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-[minmax(200px,1.5fr)_minmax(150px,1fr)_140px_140px_auto]">
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                type="search"
                className="field pl-9"
                placeholder="বিবরণ বা খাত খুঁজুন…"
                aria-label="খরচ খুঁজুন"
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
            <div className="relative">
              <ArrowDownUp
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <select
                className="field min-w-[142px] cursor-pointer pl-9 text-[13px]"
                value={sort}
                onChange={(event) => setSort(event.target.value as SortKey)}
                aria-label="সাজানোর ক্রম"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-[11.5px] text-muted">
              <span>
                <span className="font-semibold text-ink">{formatNumber(filtered.length)}</span>টি
                রেকর্ড
              </span>
              <span className="h-3 w-px bg-line" aria-hidden="true" />
              <span>
                ফিল্টার করা মোট:{' '}
                <span className="money font-semibold text-ink">{formatCurrency(total)}</span>
              </span>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[10.5px] font-medium text-muted hover:border-muted/50 hover:text-ink"
                >
                  <X size={11} /> ফিল্টার মুছুন
                </button>
              )}
            </div>
            <p className="hidden items-center gap-1 text-[10.5px] text-muted sm:flex">
              Enter চাপলে ঘর সম্পন্ন হবে · পরিবর্তন স্বয়ংক্রিয় সংরক্ষণ হয়
            </p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="skeleton h-12 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          data.expenses.length === 0 ? (
            <EmptyState
              icon={<Table2 size={25} />}
              title="আপনার খরচের খাতা এখন খালি"
              description="প্রথম খরচ যোগ করলে সেটি এখানে Excel-এর মতো সম্পাদনযোগ্য তালিকায় দেখা যাবে।"
              action={
                <button type="button" className="btn btn-primary" onClick={openCreate}>
                  <Plus size={16} /> প্রথম খরচ যোগ করুন
                </button>
              }
            />
          ) : (
            <EmptyState
              icon={<Search size={25} />}
              title="কোনো খরচ মেলেনি"
              description="ফিল্টার বা খোঁজার শব্দ বদলে আবার চেষ্টা করুন।"
              action={
                <button type="button" className="btn btn-secondary" onClick={clearFilters}>
                  সব ফিল্টার মুছুন
                </button>
              }
            />
          )
        ) : (
          <>
            <div className="w-full overflow-x-auto">
              <table className="expense-table w-full min-w-[860px] border-collapse text-left">
                <thead>
                  <tr className="table-head">
                    <th scope="col" className="w-[152px] px-3 py-2.5 font-bold">
                      তারিখ
                    </th>
                    <th scope="col" className="w-[172px] px-3 py-2.5 font-bold">
                      খাত
                    </th>
                    <th scope="col" className="min-w-[270px] px-3 py-2.5 font-bold">
                      বিবরণ
                    </th>
                    <th scope="col" className="w-[108px] px-3 py-2.5 text-right font-bold">
                      পরিমাণ
                    </th>
                    <th scope="col" className="w-[156px] px-3 py-2.5 text-right font-bold">
                      মোট টাকা
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((expense) => (
                    <ExpenseTableRow
                      key={expense.id}
                      expense={expense}
                      categories={sortedCategories}
                      onDelete={setDeleteTarget}
                      onEdit={openEdit}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-1.5 border-t border-line bg-raised/35 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11.5px] text-muted">
                {formatNumber(filtered.length)}টি খরচ
                {hasFilters ? ' (ফিল্টার করা)' : ''}
              </p>
              <p className="flex items-baseline gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  সর্বমোট
                </span>
                <span className="money font-display text-lg font-bold text-ink">
                  {formatCurrency(total)}
                </span>
              </p>
            </div>
          </>
        )}
      </section>

      <div className="mt-3 rounded-lg border border-line/70 bg-surface/50 px-4 py-3 text-[11px] leading-6 text-muted">
        <span className="font-semibold text-ink">হিসাবের নিয়ম:</span> ম্যানুয়াল মোডে মোট টাকা
        সরাসরি লিখুন। স্বয়ংক্রিয় মোডে পরিমাণ ও একক মূল্য থেকে মোট টাকা হিসাব হয়; একক মূল্য শুধু
        সম্পূর্ণ সম্পাদনা ফর্মে দেখা যায়, স্প্রেডশিটে আলাদা কলাম হিসেবে নয়।
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="খরচের রেকর্ড মুছে ফেলবেন?"
        description={
          deleteTarget
            ? `${formatDateBn(deleteTarget.date)} তারিখের “${deleteTarget.description}” (${formatCurrency(
                deleteTarget.totalAmount,
              )}) স্থায়ীভাবে মুছে যাবে। এটি ফিরিয়ে আনা যাবে না।`
            : ''
        }
        confirmLabel="হ্যাঁ, মুছে ফেলুন"
        busy={deleting}
        onConfirm={() => void handleDelete()}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
