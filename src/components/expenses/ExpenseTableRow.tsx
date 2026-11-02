import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  Calculator,
  Check,
  LoaderCircle,
  Pencil,
  ReceiptText,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Category, Expense } from '../../db/types';
import { patchExpense } from '../../db/expenseService';
import { formatNumber, parseNumericInput } from '../../lib/format';
import { DateInput } from '../ui/DateInput';
import { computeAutomaticTotal } from '../../lib/validation';
import { isValidISODate } from '../../lib/dates';
import { composeTravelDescription, isTravelCategory, travelSummaryLine } from '../../lib/travel';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface Draft {
  date: string;
  categoryId: string;
  description: string;
  quantity: string;
  totalAmount: string;
}

function toDraft(expense: Expense): Draft {
  return {
    date: expense.date,
    categoryId: expense.categoryId,
    description: expense.description,
    quantity: String(expense.quantity),
    totalAmount: String(expense.totalAmount),
  };
}

export function ExpenseTableRow({
  expense,
  categories,
  onDelete,
  onEdit,
}: {
  expense: Expense;
  categories: Category[];
  onDelete: (expense: Expense) => void;
  onEdit: (expense: Expense) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(expense));
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [inlineError, setInlineError] = useState('');
  const categoryOptions = categories.filter(
    (category) => !category.archived || category.id === expense.categoryId,
  );
  const timerRef = useRef<number | null>(null);
  const dirtyRef = useRef(false);
  const saveSequence = useRef(0);
  const latestDraft = useRef(draft);
  const savingRef = useRef(false);

  useEffect(() => {
    if (!dirtyRef.current) {
      const next = toDraft(expense);
      setDraft(next);
      latestDraft.current = next;
    }
  }, [expense]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  latestDraft.current = draft;

  const buildPatch = (next: Draft) => {
    const quantity = parseNumericInput(next.quantity);
    const enteredTotal = parseNumericInput(next.totalAmount);
    const automatic = expense.calculationMode === 'automatic';
    const computed =
      automatic && expense.unitPrice !== null && Number.isFinite(quantity)
        ? computeAutomaticTotal(quantity, expense.unitPrice)
        : enteredTotal;

    if (!isValidISODate(next.date)) return { error: 'তারিখ বৈধ নয়।' };
    if (!next.categoryId) return { error: 'খাত নির্বাচন করুন।' };
    if (!next.description.trim()) return { error: 'বিবরণ খালি রাখা যাবে না।' };
    if (next.description.trim().length > 1000) return { error: 'বিবরণ খুব দীর্ঘ।' };
    if (!Number.isFinite(quantity) || quantity <= 0) return { error: 'পরিমাণ ০-এর বেশি হতে হবে।' };
    if (!Number.isFinite(computed) || computed <= 0) return { error: 'মোট টাকা ০-এর বেশি হতে হবে।' };

    const patch: Parameters<typeof patchExpense>[1] = {
      date: next.date,
      categoryId: next.categoryId,
      description: next.description.trim(),
      quantity,
      totalAmount: computed,
    };

    if (expense.travelDetails) {
      const travelDetails = { ...expense.travelDetails, passengers: quantity };
      patch.description = composeTravelDescription(travelDetails);
      patch.travelDetails = travelDetails;
    }

    return { patch };
  };

  const persist = async (next: Draft) => {
    const result = buildPatch(next);
    if ('error' in result) {
      setStatus('error');
      setInlineError(result.error ?? 'তথ্য সঠিক নয়।');
      return;
    }
    const sequence = ++saveSequence.current;
    savingRef.current = true;
    setStatus('saving');
    setInlineError('');
    try {
      await patchExpense(expense.id, result.patch);
      if (sequence === saveSequence.current) {
        dirtyRef.current = false;
        setStatus('saved');
        window.setTimeout(() => {
          if (saveSequence.current === sequence) setStatus('idle');
        }, 1600);
      }
    } catch (error) {
      if (sequence === saveSequence.current) {
        dirtyRef.current = true;
        setStatus('error');
        setInlineError(
          error instanceof Error ? error.message : 'পরিবর্তন সংরক্ষণ করা যায়নি।',
        );
      }
    } finally {
      savingRef.current = false;
    }
  };

  const schedule = (next: Draft) => {
    latestDraft.current = next;
    dirtyRef.current = true;
    setDraft(next);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void persist(next);
    }, 550);
  };

  const flush = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (dirtyRef.current && !savingRef.current) {
      void persist(latestDraft.current);
    }
  };

  const change = (key: keyof Draft, value: string) => {
    if (key === 'categoryId') {
      const target = categories.find((category) => category.id === value);
      const currentlyTravel = Boolean(expense.travelDetails);
      if (isTravelCategory(target) !== currentlyTravel) {
        setStatus('error');
        setInlineError(
          isTravelCategory(target)
            ? 'যাতায়াতের তথ্য দিতে সম্পূর্ণ সম্পাদনা খুলুন।'
            : 'খাত বদলাতে সম্পূর্ণ সম্পাদনা খুলুন।',
        );
        return;
      }
    }
    const next = { ...draft, [key]: value };
    if (key === 'quantity' && expense.calculationMode === 'automatic' && expense.unitPrice !== null) {
      const quantity = parseNumericInput(value);
      if (Number.isFinite(quantity) && quantity > 0) {
        next.totalAmount = String(computeAutomaticTotal(quantity, expense.unitPrice));
      }
    }
    schedule(next);
  };

  const keyDown = (event: KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.currentTarget.blur();
    }
  };

  const statusIndicator = (
    <span
      className={`inline-flex items-center gap-1 text-[10px] ${
        status === 'error' ? 'text-danger' : 'text-muted'
      }`}
      aria-live="polite"
    >
      {status === 'saving' && <LoaderCircle size={11} className="animate-spin" />}
      {status === 'saved' && <Check size={11} className="text-primary" />}
      {status === 'error' && <TriangleAlert size={11} />}
      {status === 'saving'
        ? 'সংরক্ষণ হচ্ছে…'
        : status === 'saved'
          ? 'সংরক্ষিত'
          : status === 'error'
            ? inlineError
            : ''}
    </span>
  );

  return (
    <tr className="group expense-row bg-surface transition-colors hover:bg-raised/25">
      <td className="spreadsheet-cell expense-cell" data-label="তারিখ">
        <DateInput
          value={draft.date}
          onChange={(value) => change('date', value)}
          onBlur={flush}
          ariaLabel="খরচের তারিখ"
          variant="spreadsheet"
          className="w-[134px]"
        />
      </td>
      <td className="spreadsheet-cell expense-cell" data-label="খাত">
        <select
          className="spreadsheet-input cursor-pointer"
          value={draft.categoryId}
          onChange={(event) => change('categoryId', event.target.value)}
          onBlur={flush}
          onKeyDown={keyDown}
          aria-label="খরচের খাত"
        >
          {categoryOptions.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
              {category.archived ? ' (সংরক্ষিত)' : ''}
            </option>
          ))}
        </select>
      </td>
      <td className="spreadsheet-cell expense-cell expense-description-cell" data-label="বিবরণ">
        {expense.travelDetails ? (
          <button
            type="button"
            className="block w-full rounded-md px-1.5 py-1 text-left transition-colors hover:bg-raised/70"
            onClick={() => onEdit(expense)}
            aria-label={`${travelSummaryLine(expense.travelDetails)} — যাতায়াতের বিস্তারিত সম্পাদনা`}
          >
            <span className="block truncate text-[13px] font-medium text-ink">
              {travelSummaryLine(expense.travelDetails)}
            </span>
            <span className="mt-0.5 block truncate text-[11px] text-muted">
              {expense.travelDetails.purpose}
            </span>
          </button>
        ) : (
          <input
            type="text"
            className="spreadsheet-input"
            value={draft.description}
            onChange={(event) => change('description', event.target.value)}
            onBlur={flush}
            onKeyDown={keyDown}
            aria-label="খরচের বিবরণ"
            placeholder="বিবরণ লিখুন"
          />
        )}
        <div className="mt-0.5 flex items-center justify-between gap-2 px-1">
          <span className="min-h-[15px]">{statusIndicator}</span>
          <div className="flex shrink-0 items-center gap-0.5 opacity-90 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
            <Link
              to={`/vouchers/${expense.id}`}
              className="icon-btn h-7 w-7"
              aria-label={`${expense.description} — ভাউচার দেখুন`}
              title="ভাউচার তৈরি করুন"
            >
              <ReceiptText size={14} />
            </Link>
            <button
              type="button"
              className="icon-btn h-7 w-7"
              onClick={() => onEdit(expense)}
              aria-label={`${expense.description} — সম্পূর্ণ সম্পাদনা`}
              title="সম্পূর্ণ সম্পাদনা"
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              className="icon-btn h-7 w-7 hover:bg-danger-soft hover:text-danger"
              onClick={() => onDelete(expense)}
              aria-label={`${expense.description} — মুছে ফেলুন`}
              title="মুছে ফেলুন"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </td>
      <td
        className="spreadsheet-cell expense-cell"
        data-label={expense.travelDetails ? 'কতজন' : 'পরিমাণ'}
      >
        <input
          type="text"
          inputMode="decimal"
          className="spreadsheet-input text-right tabular-nums"
          value={draft.quantity}
          onChange={(event) => change('quantity', event.target.value)}
          onBlur={flush}
          onKeyDown={keyDown}
          aria-label={expense.travelDetails ? 'কতজন যাত্রী' : 'পরিমাণ'}
        />
      </td>
      <td className="spreadsheet-cell expense-cell expense-total-cell" data-label="মোট টাকা">
        {expense.calculationMode === 'automatic' ? (
          <div
            className="flex items-center justify-end gap-1.5 rounded-md bg-primary-soft/45 px-2 py-1.5 text-[13px] font-semibold tabular-nums text-ink"
            title="স্বয়ংক্রিয় হিসাব: পরিমাণ × একক মূল্য"
          >
            <Calculator size={12} className="text-primary" />
            {formatNumber(parseNumericInput(draft.totalAmount))}
          </div>
        ) : (
          <input
            type="text"
            inputMode="decimal"
            className="spreadsheet-input text-right font-semibold tabular-nums"
            value={draft.totalAmount}
            onChange={(event) => change('totalAmount', event.target.value)}
            onBlur={flush}
            onKeyDown={keyDown}
            aria-label="মোট টাকা"
          />
        )}
      </td>
    </tr>
  );
}
