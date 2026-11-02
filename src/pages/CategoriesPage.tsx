import { useMemo, useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Archive,
  ArchiveRestore,
  FolderPlus,
  Pencil,
  Plus,
  Tags,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import { db } from '../db/database';
import {
  createCategory,
  deleteCategory,
  renameCategory,
  setCategoryArchived,
} from '../db/categoryService';
import type { Category, CategoryWithUsage } from '../db/types';
import { PageHeader } from '../components/ui/PageHeader';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../providers/ToastProvider';
import { formatCurrency, formatNumber } from '../lib/format';

function CategoryFormModal({
  category,
  onClose,
}: {
  category: Category | null;
  onClose: () => void;
}) {
  const [name, setName] = useState(category?.name ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (category) {
        await renameCategory(category.id, name);
        toast.success('খাতের নাম পরিবর্তন হয়েছে।');
      } else {
        await createCategory(name);
        toast.success('নতুন খাত সংরক্ষণ হয়েছে।');
      }
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'খাত সংরক্ষণ করা যায়নি।');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={busy ? () => undefined : onClose}
      title={category ? 'খাতের নাম পরিবর্তন' : 'নতুন খাত তৈরি'}
      description={
        category
          ? 'নাম বদলালে সংশ্লিষ্ট সব খরচে নতুন নামটিই দেখা যাবে।'
          : 'খরচকে শ্রেণিবদ্ধ করতে একটি নতুন খাত যোগ করুন।'
      }
      size="sm"
      dismissible={!busy}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
            বাতিল
          </button>
          <button type="submit" form="category-form" className="btn btn-primary" disabled={busy}>
            {busy ? 'সংরক্ষণ হচ্ছে…' : category ? 'নাম পরিবর্তন করুন' : 'খাত যোগ করুন'}
          </button>
        </>
      }
    >
      <form id="category-form" onSubmit={submit} noValidate>
        <label htmlFor="category-name" className="field-label">
          খাতের নাম
        </label>
        <input
          id="category-name"
          type="text"
          className="field"
          maxLength={60}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError('');
          }}
          placeholder="যেমন: অফিস খরচ"
          autoFocus
          aria-invalid={Boolean(error)}
        />
        {error ? (
          <p className="field-error" role="alert">
            {error}
          </p>
        ) : (
          <p className="field-hint">২ থেকে ৬০ অক্ষরের মধ্যে একটি স্পষ্ট নাম দিন।</p>
        )}
      </form>
    </Modal>
  );
}

export function CategoriesPage() {
  const data = useLiveQuery(async () => {
    const [categories, expenses] = await Promise.all([
      db.categories.toArray(),
      db.expenses.toArray(),
    ]);
    return { categories, expenses };
  }, []);
  const toast = useToast();
  const [formCategory, setFormCategory] = useState<Category | null | 'new'>(null);
  const [archiveTarget, setArchiveTarget] = useState<CategoryWithUsage | null>(null);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CategoryWithUsage | null>(null);
  const [reassignTo, setReassignTo] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [filter, setFilter] = useState<'active' | 'archived' | 'all'>('active');

  const categories: CategoryWithUsage[] = useMemo(() => {
    if (!data) return [];
    const totals = new Map<string, { count: number; amount: number }>();
    for (const expense of data.expenses) {
      const current = totals.get(expense.categoryId) ?? { count: 0, amount: 0 };
      current.count += 1;
      current.amount += expense.totalAmount;
      totals.set(expense.categoryId, current);
    }
    return data.categories
      .map((category) => ({
        ...category,
        expenseCount: totals.get(category.id)?.count ?? 0,
        totalAmount: totals.get(category.id)?.amount ?? 0,
      }))
      .sort(
        (a, b) =>
          Number(a.archived) - Number(b.archived) ||
          b.expenseCount - a.expenseCount ||
          a.name.localeCompare(b.name, 'bn'),
      );
  }, [data]);

  const visible = categories.filter((category) => {
    if (filter === 'active') return !category.archived;
    if (filter === 'archived') return category.archived;
    return true;
  });
  const activeCount = categories.filter((category) => !category.archived).length;
  const archivedCount = categories.length - activeCount;
  const activeAlternatives = categories.filter(
    (category) => !category.archived && category.id !== deleteTarget?.id,
  );

  const requestDelete = (category: CategoryWithUsage) => {
    setDeleteTarget(category);
    setReassignTo(activeAlternatives[0]?.id ?? '');
  };

  const confirmArchive = async () => {
    if (!archiveTarget) return;
    setArchiveBusy(true);
    try {
      await setCategoryArchived(archiveTarget.id, !archiveTarget.archived);
      toast.success(
        archiveTarget.archived ? 'খাতটি পুনরায় সক্রিয় করা হয়েছে।' : 'খাতটি আর্কাইভ করা হয়েছে।',
      );
      setArchiveTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'খাত হালনাগাদ করা যায়নি।');
    } finally {
      setArchiveBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.expenseCount > 0 && !reassignTo) {
      toast.error('খরচগুলো সরানোর জন্য অন্য একটি সক্রিয় খাত নির্বাচন করুন।');
      return;
    }
    setDeleteBusy(true);
    try {
      const result = await deleteCategory(
        deleteTarget.id,
        deleteTarget.expenseCount > 0 ? reassignTo : null,
      );
      toast.success(
        result.movedExpenses > 0
          ? `খাতটি মুছে ফেলা হয়েছে এবং ${formatNumber(result.movedExpenses)}টি খরচ নতুন খাতে সরানো হয়েছে।`
          : 'খাতটি মুছে ফেলা হয়েছে।',
      );
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'খাতটি মোছা যায়নি।');
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="খাত ব্যবস্থাপনা"
        title="খরচের খাত"
        description="খাত তৈরি, নাম পরিবর্তন, আর্কাইভ ও নিরাপদে মুছে ফেলুন। নাম বদলালেও খরচের রেকর্ড অক্ষত থাকে।"
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setFormCategory('new')}>
            <Plus size={17} /> নতুন খাত
          </button>
        }
      />

      <div className="mb-5 grid grid-cols-3 gap-2.5 sm:max-w-xl">
        <div className="card px-3.5 py-3">
          <p className="text-[10.5px] text-muted">সক্রিয় খাত</p>
          <p className="mt-1 font-display text-xl font-bold">{formatNumber(activeCount)}</p>
        </div>
        <div className="card px-3.5 py-3">
          <p className="text-[10.5px] text-muted">আর্কাইভ</p>
          <p className="mt-1 font-display text-xl font-bold">{formatNumber(archivedCount)}</p>
        </div>
        <div className="card px-3.5 py-3">
          <p className="text-[10.5px] text-muted">মোট খরচ</p>
          <p className="mt-1 font-display text-xl font-bold">
            {formatNumber(data?.expenses.length ?? 0)}
          </p>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-1 rounded-lg border border-line bg-surface p-1 sm:w-fit">
        {(
          [
            ['active', 'সক্রিয়'],
            ['archived', 'আর্কাইভ'],
            ['all', 'সব'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`flex-1 rounded-md px-3.5 py-1.5 text-[12px] font-semibold transition-colors sm:flex-none ${
              filter === value
                ? 'bg-primary-soft text-primary'
                : 'text-muted hover:text-ink'
            }`}
            aria-pressed={filter === value}
          >
            {label}
            {value === 'active' && activeCount > 0 ? ` (${formatNumber(activeCount)})` : ''}
            {value === 'archived' && archivedCount > 0 ? ` (${formatNumber(archivedCount)})` : ''}
          </button>
        ))}
      </div>

      {data === undefined ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="card h-40 p-5">
              <div className="skeleton h-4 w-28" />
              <div className="skeleton mt-4 h-3 w-40" />
              <div className="skeleton mt-8 h-8 w-full" />
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Tags size={25} />}
            title={filter === 'archived' ? 'কোনো আর্কাইভ করা খাত নেই' : 'কোনো খাত পাওয়া যায়নি'}
            description={
              filter === 'archived'
                ? 'আর্কাইভ করা খাত এখানে দেখা যাবে। আর্কাইভ করলে পুরোনো খরচ অক্ষত থাকে।'
                : 'নতুন খাত তৈরি করে খরচগুলোকে সহজে শ্রেণিবদ্ধ করুন।'
            }
            action={
              <button type="button" className="btn btn-primary" onClick={() => setFormCategory('new')}>
                <FolderPlus size={16} /> নতুন খাত তৈরি করুন
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((category) => (
            <article
              key={category.id}
              className={`card flex flex-col p-4 transition-colors ${
                category.archived ? 'bg-raised/25' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-display text-base font-bold ${
                      category.archived
                        ? 'bg-raised text-muted'
                        : 'bg-primary-soft text-primary'
                    }`}
                  >
                    {category.name.slice(0, 1)}
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate text-[14px] font-semibold text-ink">
                      {category.name}
                    </h2>
                    <p className="mt-0.5 text-[10.5px] text-muted">
                      {category.archived ? 'নতুন খরচে ব্যবহার করা যাবে না' : 'সক্রিয় খাত'}
                    </p>
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-semibold ${
                    category.archived
                      ? 'bg-raised text-muted'
                      : 'bg-primary-soft text-primary'
                  }`}
                >
                  {category.archived ? 'আর্কাইভ' : 'সক্রিয়'}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg border border-line/70 bg-raised/35 p-2.5">
                <div>
                  <p className="text-[9.5px] text-muted">খরচের সংখ্যা</p>
                  <p className="mt-0.5 text-[13px] font-semibold">
                    {formatNumber(category.expenseCount)}টি
                  </p>
                </div>
                <div className="border-l border-line pl-2.5">
                  <p className="text-[9.5px] text-muted">মোট খরচ</p>
                  <p className="money mt-0.5 truncate text-[12px] font-semibold">
                    {formatCurrency(category.totalAmount)}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-1 border-t border-line/70 pt-2.5">
                <button
                  type="button"
                  className="btn btn-ghost h-8 min-h-0 px-2.5 text-[11.5px]"
                  onClick={() => setFormCategory(category)}
                >
                  <Pencil size={13} /> নাম বদলান
                </button>
                <button
                  type="button"
                  className="btn btn-ghost h-8 min-h-0 px-2.5 text-[11.5px]"
                  onClick={() => setArchiveTarget(category)}
                >
                  {category.archived ? (
                    <>
                      <ArchiveRestore size={13} /> সক্রিয় করুন
                    </>
                  ) : (
                    <>
                      <Archive size={13} /> আর্কাইভ
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="icon-btn ml-auto h-8 w-8 hover:bg-danger-soft hover:text-danger"
                  onClick={() => requestDelete(category)}
                  aria-label={`${category.name} খাত মুছে ফেলুন`}
                  title="খাত মুছে ফেলুন"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="mt-4 rounded-lg border border-line/70 bg-surface/50 px-4 py-3 text-[11px] leading-6 text-muted">
        <span className="font-semibold text-ink">নিরাপত্তা:</span> কোনো খাতে খরচ থাকলে খাতটি
        মুছে ফেলার আগে অন্য খাতে সরানোর নিশ্চয়তা চাওয়া হয়। আর্কাইভ করলে কোনো খরচ মুছে যায় না।
      </div>

      {formCategory !== null && (
        <CategoryFormModal
          category={formCategory === 'new' ? null : formCategory}
          onClose={() => setFormCategory(null)}
        />
      )}

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        title={archiveTarget?.archived ? 'খাতটি আবার সক্রিয় করবেন?' : 'খাতটি আর্কাইভ করবেন?'}
        description={
          archiveTarget?.archived
            ? `“${archiveTarget.name}” আবার নতুন খরচের জন্য ব্যবহার করা যাবে। পুরোনো রেকর্ড অপরিবর্তিত থাকবে।`
            : `“${archiveTarget?.name}” নতুন খরচে আর দেখাবে না। তবে এর ${formatNumber(
                archiveTarget?.expenseCount ?? 0,
              )}টি পুরোনো খরচ ও ভাউচার অক্ষত থাকবে।`
        }
        tone="primary"
        confirmLabel={archiveTarget?.archived ? 'সক্রিয় করুন' : 'আর্কাইভ করুন'}
        busy={archiveBusy}
        onConfirm={() => void confirmArchive()}
        onClose={() => setArchiveTarget(null)}
      />

      {deleteTarget && (
        <Modal
          open
          onClose={deleteBusy ? () => undefined : () => setDeleteTarget(null)}
          title="খাতটি স্থায়ীভাবে মুছে ফেলবেন?"
          description={`“${deleteTarget.name}” খাতটি মুছে ফেলা হবে।`}
          size="sm"
          dismissible={!deleteBusy}
          footer={
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteBusy}
              >
                বাতিল
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => void confirmDelete()}
                disabled={deleteBusy || (deleteTarget.expenseCount > 0 && !reassignTo)}
              >
                {deleteBusy ? 'মুছে ফেলা হচ্ছে…' : 'খাত মুছে ফেলুন'}
              </button>
            </>
          }
        >
          {deleteTarget.expenseCount > 0 ? (
            <div>
              <div className="flex gap-3 rounded-lg border border-accent/25 bg-accent-soft/60 p-3.5">
                <TriangleAlert size={18} className="mt-0.5 shrink-0 text-accent" />
                <p className="text-sm leading-7 text-ink">
                  এই খাতে <strong>{formatNumber(deleteTarget.expenseCount)}টি</strong> খরচ
                  রয়েছে। খাতটি মুছলে এগুলো মুছে যাবে না — প্রথমে অন্য একটি খাতে সরাতে হবে।
                </p>
              </div>
              <label htmlFor="reassign-category" className="field-label mt-4">
                খরচগুলো যে খাতে সরাবে
              </label>
              {activeAlternatives.length > 0 ? (
                <select
                  id="reassign-category"
                  className="field"
                  value={reassignTo}
                  onChange={(event) => setReassignTo(event.target.value)}
                >
                  {activeAlternatives.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-danger">
                  অন্য কোনো সক্রিয় খাত নেই। আগে নতুন খাত তৈরি করুন, অথবা এই খাতটি আর্কাইভ করুন।
                </p>
              )}
              <p className="field-hint">খরচের বিবরণ, তারিখ ও টাকার পরিমাণ অপরিবর্তিত থাকবে।</p>
            </div>
          ) : (
            <p className="text-sm leading-7 text-muted">
              এই খাতে কোনো খরচ নেই, তাই নিরাপদে মুছে ফেলা যাবে। এই কাজটি ফিরিয়ে আনা যাবে না।
            </p>
          )}
        </Modal>
      )}
    </div>
  );
}
