import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Calculator, Check, AlertCircle, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from '../../db/database';
import { createExpense, updateExpense } from '../../db/expenseService';
import type { CalculationMode, Expense, TravelDetails } from '../../db/types';
import { Modal } from '../ui/Modal';
import { DateInput } from '../ui/DateInput';
import { useToast } from '../../providers/ToastProvider';
import { todayISO } from '../../lib/dates';
import { formatCurrency, parseNumericInput } from '../../lib/format';
import {
  composeTravelDescription,
  isTravelCategory,
  TRAVEL_MODES,
  validateTravelFields,
  type TravelFormErrors,
  type TravelFormValues,
} from '../../lib/travel';
import {
  computeAutomaticTotal,
  validateExpenseForm,
  type ExpenseFormErrors,
  type ExpenseFormValues,
} from '../../lib/validation';

interface ExpenseEditorContextValue {
  openCreate: () => void;
  openEdit: (expense: Expense) => void;
}

const ExpenseEditorContext = createContext<ExpenseEditorContextValue | null>(null);

interface EditorState {
  open: boolean;
  expense: Expense | null;
  nonce: number;
}

function emptyValues(categoryId = ''): ExpenseFormValues {
  return {
    date: todayISO(),
    categoryId,
    description: '',
    calculationMode: 'manual',
    quantity: '1',
    unitPrice: '',
    totalAmount: '',
  };
}

function valuesFromExpense(expense: Expense): ExpenseFormValues {
  return {
    date: expense.date,
    categoryId: expense.categoryId,
    description: expense.description,
    calculationMode: expense.calculationMode,
    quantity: String(expense.quantity),
    unitPrice: expense.unitPrice === null ? '' : String(expense.unitPrice),
    totalAmount: String(expense.totalAmount),
  };
}

function emptyTravelValues(): TravelFormValues {
  return { from: '', to: '', mode: '', purpose: '' };
}

function travelValuesFromExpense(expense: Expense | null): TravelFormValues {
  const details: TravelDetails | null | undefined = expense?.travelDetails;
  if (!details) return emptyTravelValues();
  return {
    from: details.from,
    to: details.to,
    mode: details.mode,
    purpose: details.purpose,
  };
}

function ExpenseDialog({
  expense,
  onClose,
}: {
  expense: Expense | null;
  onClose: () => void;
}) {
  const categories = useLiveQuery(() => db.categories.toArray(), [], []);
  const activeCategories = (categories ?? []).filter((category) => !category.archived);
  const editingCategory = expense
    ? categories?.find((category) => category.id === expense.categoryId)
    : null;
  const defaultCategory = activeCategories[0]?.id ?? expense?.categoryId ?? '';
  const [values, setValues] = useState<ExpenseFormValues>(() =>
    expense ? valuesFromExpense(expense) : emptyValues(defaultCategory),
  );
  const [travelValues, setTravelValues] = useState<TravelFormValues>(() =>
    travelValuesFromExpense(expense),
  );
  const [errors, setErrors] = useState<ExpenseFormErrors>({});
  const [travelErrors, setTravelErrors] = useState<TravelFormErrors>({});
  const [busy, setBusy] = useState(false);
  const [serviceError, setServiceError] = useState('');
  const [lastManualTotal, setLastManualTotal] = useState(
    expense?.calculationMode === 'manual' ? String(expense.totalAmount) : '',
  );
  const toast = useToast();

  const selectedCategory = (categories ?? []).find((category) => category.id === values.categoryId);
  const isTravel = isTravelCategory(selectedCategory);

  useEffect(() => {
    if (!values.categoryId && defaultCategory) {
      setValues((current) => ({ ...current, categoryId: defaultCategory }));
    }
  }, [defaultCategory, values.categoryId]);

  const autoTotal =
    values.calculationMode === 'automatic'
      ? (() => {
          const quantity = parseNumericInput(values.quantity);
          const unitPrice = parseNumericInput(values.unitPrice);
          if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) return null;
          return computeAutomaticTotal(quantity, unitPrice);
        })()
      : null;

  const update = <K extends keyof ExpenseFormValues>(key: K, value: ExpenseFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined, form: undefined }));
    setServiceError('');
  };

  const updateTravel = <K extends keyof TravelFormValues>(key: K, value: TravelFormValues[K]) => {
    setTravelValues((current) => ({ ...current, [key]: value }));
    setTravelErrors((current) => ({ ...current, [key]: undefined }));
    setServiceError('');
  };

  const handleCategoryChange = (categoryId: string) => {
    const target = (categories ?? []).find((category) => category.id === categoryId);
    if (isTravelCategory(target) && !expense?.travelDetails) {
      const existing = travelValues.purpose.trim();
      const previousDescription = values.description.trim();
      if (!existing && previousDescription && !previousDescription.includes('\n')) {
        setTravelValues((current) => ({ ...current, purpose: previousDescription }));
      }
      if (!values.quantity.trim() || parseNumericInput(values.quantity) <= 0) {
        setValues((current) => ({ ...current, quantity: '1' }));
      }
    }
    update('categoryId', categoryId);
  };

  const setMode = (mode: CalculationMode) => {
    if (mode === values.calculationMode) return;
    if (mode === 'automatic') {
      const total = parseNumericInput(values.totalAmount);
      const quantity = parseNumericInput(values.quantity);
      if (!values.unitPrice && Number.isFinite(total) && Number.isFinite(quantity) && quantity > 0) {
        setValues((current) => ({
          ...current,
          calculationMode: mode,
          unitPrice: String(Math.round((total / quantity + Number.EPSILON) * 100) / 100),
        }));
      } else {
        setValues((current) => ({ ...current, calculationMode: mode }));
      }
    } else {
      setLastManualTotal(values.totalAmount);
      setValues((current) => ({
        ...current,
        calculationMode: mode,
        totalAmount:
          autoTotal !== null && autoTotal > 0 ? String(autoTotal) : lastManualTotal || current.totalAmount,
      }));
    }
    setErrors({});
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setServiceError('');

    const passengers = parseNumericInput(values.quantity);
    const travelResult = isTravel
      ? validateTravelFields(travelValues, passengers)
      : { errors: {}, details: null };
    setTravelErrors(travelResult.errors);

    const composedDescription = travelResult.details
      ? composeTravelDescription(travelResult.details)
      : values.description;
    const result = validateExpenseForm({
      ...values,
      description: isTravel ? composedDescription || ' ' : composedDescription,
    });

    if (!result.data || (isTravel && !travelResult.details)) {
      setErrors(result.errors);
      return;
    }

    const payload =
      isTravel && travelResult.details
        ? {
            ...result.data,
            description: composeTravelDescription(travelResult.details),
            travelDetails: travelResult.details,
          }
        : result.data;

    setBusy(true);
    try {
      if (expense) {
        await updateExpense(expense.id, payload);
        toast.success('খরচের তথ্য হালনাগাদ হয়েছে।');
      } else {
        await createExpense(payload);
        toast.success('নতুন খরচ যোগ হয়েছে।');
      }
      onClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'খরচ সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।';
      setServiceError(message);
    } finally {
      setBusy(false);
    }
  };

  const availableCategories =
    editingCategory && editingCategory.archived && !activeCategories.some((c) => c.id === editingCategory.id)
      ? [editingCategory, ...activeCategories]
      : activeCategories;

  return (
    <Modal
      open
      onClose={busy ? () => undefined : onClose}
      title={expense ? 'খরচ সম্পাদনা' : 'নতুন খরচ যোগ করুন'}
      description={
        expense
          ? 'তথ্য পরিবর্তন করলে সঙ্গে সঙ্গে সংরক্ষিত হবে।'
          : 'আজকের তারিখ স্বয়ংক্রিয়ভাবে বসানো হয়েছে। প্রয়োজনে বদলে নিন।'
      }
      size="lg"
      dismissible={!busy}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
            বাতিল
          </button>
          <button
            type="submit"
            form="expense-form"
            className="btn btn-primary"
            disabled={busy || availableCategories.length === 0}
          >
            {busy ? 'সংরক্ষণ হচ্ছে…' : expense ? 'পরিবর্তন সংরক্ষণ করুন' : 'খরচ যোগ করুন'}
            {!busy && <Check size={16} />}
          </button>
        </>
      }
    >
      {availableCategories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-raised/40 p-6 text-center">
          <p className="font-semibold text-ink">কোনো সক্রিয় খাত নেই</p>
          <p className="mt-1 text-sm leading-7 text-muted">
            খরচ যোগ করার আগে অন্তত একটি খাত তৈরি বা পুনরুদ্ধার করুন।
          </p>
          <Link to="/categories" className="btn btn-primary mt-4" onClick={onClose}>
            <Plus size={16} /> খাত ব্যবস্থাপনায় যান
          </Link>
        </div>
      ) : (
        <form id="expense-form" onSubmit={handleSubmit} noValidate className="space-y-4">
          {serviceError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-danger/20 bg-danger-soft px-3.5 py-3 text-sm text-danger"
            >
              <AlertCircle size={17} className="mt-0.5 shrink-0" />
              {serviceError}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="expense-date">
                তারিখ <span className="text-danger">*</span>
              </label>
              <DateInput
                id="expense-date"
                value={values.date}
                onChange={(value) => update('date', value)}
                ariaLabel="খরচের তারিখ"
                ariaInvalid={Boolean(errors.date)}
              />
              {errors.date && <p className="field-error">{errors.date}</p>}
            </div>
            <div>
              <label className="field-label" htmlFor="expense-category">
                খাত <span className="text-danger">*</span>
              </label>
              <select
                id="expense-category"
                className="field"
                value={values.categoryId}
                onChange={(event) => handleCategoryChange(event.target.value)}
                aria-invalid={Boolean(errors.categoryId)}
              >
                <option value="">খাত নির্বাচন করুন</option>
                {availableCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                    {category.archived ? ' (সংরক্ষিত)' : ''}
                  </option>
                ))}
              </select>
              {errors.categoryId && <p className="field-error">{errors.categoryId}</p>}
            </div>
          </div>

          {isTravel ? (
            <section className="space-y-4 rounded-xl border border-primary/20 bg-primary-soft/25 p-4">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Calculator size={14} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-ink">যাতায়াতের তথ্য</h3>
                  <p className="mt-0.5 text-xs leading-6 text-muted">
                    বিবরণের বদলে যাত্রার বিস্তারিত দিন। এগুলো ভাউচারে পরিষ্কারভাবে সাজানো হবে।
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="field-label" htmlFor="travel-from">
                    কোথা থেকে <span className="text-danger">*</span>
                  </label>
                  <input
                    id="travel-from"
                    type="text"
                    className="field"
                    placeholder="যেমন: ঢাকা"
                    value={travelValues.from}
                    onChange={(event) => updateTravel('from', event.target.value)}
                    aria-invalid={Boolean(travelErrors.from)}
                  />
                  {travelErrors.from && <p className="field-error">{travelErrors.from}</p>}
                </div>
                <div>
                  <label className="field-label" htmlFor="travel-to">
                    কোথায় <span className="text-danger">*</span>
                  </label>
                  <input
                    id="travel-to"
                    type="text"
                    className="field"
                    placeholder="যেমন: গাজীপুর"
                    value={travelValues.to}
                    onChange={(event) => updateTravel('to', event.target.value)}
                    aria-invalid={Boolean(travelErrors.to)}
                  />
                  {travelErrors.to && <p className="field-error">{travelErrors.to}</p>}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="field-label" htmlFor="travel-mode">
                    মাধ্যম <span className="text-danger">*</span>
                  </label>
                  <select
                    id="travel-mode"
                    className="field"
                    value={travelValues.mode}
                    onChange={(event) => updateTravel('mode', event.target.value)}
                    aria-invalid={Boolean(travelErrors.mode)}
                  >
                    <option value="">মাধ্যম নির্বাচন করুন</option>
                    {TRAVEL_MODES.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                  {travelErrors.mode && <p className="field-error">{travelErrors.mode}</p>}
                </div>
                <div>
                  <label className="field-label" htmlFor="travel-passengers">
                    কতজন <span className="text-danger">*</span>
                  </label>
                  <input
                    id="travel-passengers"
                    type="text"
                    inputMode="decimal"
                    className="field"
                    value={values.quantity}
                    onChange={(event) => {
                      update('quantity', event.target.value);
                      setTravelErrors((current) => ({ ...current, passengers: undefined }));
                    }}
                    aria-invalid={Boolean(travelErrors.passengers || errors.quantity)}
                  />
                  {(travelErrors.passengers || errors.quantity) && (
                    <p className="field-error">{travelErrors.passengers ?? errors.quantity}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="field-label" htmlFor="travel-purpose">
                  উদ্দেশ্য <span className="text-danger">*</span>
                </label>
                <textarea
                  id="travel-purpose"
                  rows={2}
                  className="field resize-y"
                  placeholder="যেমন: অফিসের কাজে সভায় যাওয়া"
                  value={travelValues.purpose}
                  onChange={(event) => updateTravel('purpose', event.target.value)}
                  aria-invalid={Boolean(travelErrors.purpose)}
                />
                {travelErrors.purpose && <p className="field-error">{travelErrors.purpose}</p>}
              </div>
            </section>
          ) : (
            <div>
              <label className="field-label" htmlFor="expense-description">
                বিবরণ <span className="text-danger">*</span>
              </label>
              <textarea
                id="expense-description"
                rows={3}
                className="field resize-y"
                placeholder="যেমন: বাস ভাড়া, অতিথি আপ্যায়ন…"
                value={values.description}
                onChange={(event) => update('description', event.target.value)}
                aria-invalid={Boolean(errors.description)}
              />
              <div className="flex justify-between gap-3">
                {errors.description ? (
                  <p className="field-error">{errors.description}</p>
                ) : (
                  <p className="field-hint">এই বিবরণটিই ভাউচারে দেখা যাবে।</p>
                )}
                <span className="mt-1.5 text-xs text-muted">{values.description.length}/১০০০</span>
              </div>
            </div>
          )}

          <fieldset>
            <legend className="field-label">হিসাবের পদ্ধতি</legend>
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-line bg-raised/40 p-1.5">
              <button
                type="button"
                onClick={() => setMode('manual')}
                className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-[13px] font-semibold transition-colors ${
                  values.calculationMode === 'manual'
                    ? 'bg-surface text-ink shadow-sm'
                    : 'text-muted hover:text-ink'
                }`}
                aria-pressed={values.calculationMode === 'manual'}
              >
                ম্যানুয়াল
              </button>
              <button
                type="button"
                onClick={() => setMode('automatic')}
                className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-[13px] font-semibold transition-colors ${
                  values.calculationMode === 'automatic'
                    ? 'bg-surface text-ink shadow-sm'
                    : 'text-muted hover:text-ink'
                }`}
                aria-pressed={values.calculationMode === 'automatic'}
              >
                <Calculator size={15} />
                স্বয়ংক্রিয়
              </button>
            </div>
          </fieldset>

          <div className={`grid gap-4 ${isTravel ? '' : 'sm:grid-cols-2'}`}>
            {!isTravel && (
              <div>
                <label className="field-label" htmlFor="expense-quantity">
                  পরিমাণ <span className="text-danger">*</span>
                </label>
                <input
                  id="expense-quantity"
                  type="text"
                  inputMode="decimal"
                  className="field"
                  value={values.quantity}
                  onChange={(event) => update('quantity', event.target.value)}
                  aria-invalid={Boolean(errors.quantity)}
                />
                {errors.quantity && <p className="field-error">{errors.quantity}</p>}
              </div>
            )}

            {values.calculationMode === 'automatic' ? (
              <div>
                <label className="field-label" htmlFor="expense-unit-price">
                  {isTravel ? 'প্রতি যাত্রীর ভাড়া (৳)' : 'একক মূল্য (৳)'}{' '}
                  <span className="text-danger">*</span>
                </label>
                <input
                  id="expense-unit-price"
                  type="text"
                  inputMode="decimal"
                  className="field"
                  placeholder="যেমন: ২৫০"
                  value={values.unitPrice}
                  onChange={(event) => update('unitPrice', event.target.value)}
                  aria-invalid={Boolean(errors.unitPrice)}
                />
                {errors.unitPrice && <p className="field-error">{errors.unitPrice}</p>}
              </div>
            ) : (
              <div>
                <label className="field-label" htmlFor="expense-total">
                  মোট টাকা (৳) <span className="text-danger">*</span>
                </label>
                <input
                  id="expense-total"
                  type="text"
                  inputMode="decimal"
                  className="field"
                  placeholder="যেমন: ৫০০"
                  value={values.totalAmount}
                  onChange={(event) => update('totalAmount', event.target.value)}
                  aria-invalid={Boolean(errors.totalAmount)}
                />
                {errors.totalAmount && <p className="field-error">{errors.totalAmount}</p>}
              </div>
            )}
          </div>

          {values.calculationMode === 'automatic' && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/15 bg-primary-soft/60 px-4 py-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                  স্বয়ংক্রিয় মোট
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {isTravel ? 'কতজন × প্রতি যাত্রীর ভাড়া' : 'পরিমাণ × একক মূল্য'}
                </p>
              </div>
              <p className="money font-display text-xl font-bold text-ink">
                {autoTotal !== null && Number.isFinite(autoTotal) && autoTotal > 0
                  ? formatCurrency(autoTotal)
                  : '৳ —'}
              </p>
            </div>
          )}

          {values.calculationMode === 'manual' && errors.totalAmount && (
            <p className="field-error" role="alert">
              {errors.totalAmount}
            </p>
          )}
        </form>
      )}
    </Modal>
  );
}

export function ExpenseEditorProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<EditorState>({ open: false, expense: null, nonce: 0 });

  const openCreate = useCallback(() => {
    setState((current) => ({ open: true, expense: null, nonce: current.nonce + 1 }));
  }, []);

  const openEdit = useCallback((expense: Expense) => {
    setState((current) => ({ open: true, expense, nonce: current.nonce + 1 }));
  }, []);

  const close = useCallback(() => {
    setState((current) => ({ ...current, open: false }));
  }, []);

  const value = useMemo(() => ({ openCreate, openEdit }), [openCreate, openEdit]);

  return (
    <ExpenseEditorContext.Provider value={value}>
      {children}
      {state.open && (
        <ExpenseDialog key={state.nonce} expense={state.expense} onClose={close} />
      )}
    </ExpenseEditorContext.Provider>
  );
}

export function useExpenseEditor(): ExpenseEditorContextValue {
  const context = useContext(ExpenseEditorContext);
  if (!context) throw new Error('useExpenseEditor must be used within ExpenseEditorProvider');
  return context;
}
