import { createPortal } from 'react-dom';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  FileSpreadsheet,
  FileText,
  LoaderCircle,
  Printer,
  TriangleAlert,
} from 'lucide-react';
import { db } from '../db/database';
import type { Expense } from '../db/types';
import { useProfile } from '../providers/ProfileProvider';
import { useToast } from '../providers/ToastProvider';
import { VoucherDocument } from '../components/vouchers/VoucherDocument';
import { TravelVoucherDocument } from '../components/vouchers/TravelVoucherDocument';
import { PageHeader } from '../components/ui/PageHeader';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { downloadVoucherPdf, printInLayout } from '../lib/pdf';
import { formatDateBn, formatVoucherDate } from '../lib/dates';
import { isNativeApp } from '../lib/native';

function ScaledSheet({ children }: { children: ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState({ width: 0, height: 0, scale: 1 });

  useLayoutEffect(() => {
    const measure = () => {
      const outer = outerRef.current;
      const paper = paperRef.current;
      if (!outer || !paper) return;
      const naturalWidth = paper.offsetWidth;
      const naturalHeight = paper.offsetHeight;
      if (!naturalWidth) return;
      const scale = Math.min(outer.clientWidth / naturalWidth, 1);
      setMetrics({
        width: naturalWidth * scale,
        height: naturalHeight * scale,
        scale,
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (outerRef.current) observer.observe(outerRef.current);
    window.addEventListener('resize', measure);
    const timer = window.setTimeout(measure, 150);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div ref={outerRef} className="w-full overflow-hidden">
      <div className="mx-auto" style={{ width: metrics.width, height: metrics.height }}>
        <div
          ref={paperRef}
          style={{
            width: 'max-content',
            transform: `scale(${metrics.scale})`,
            transformOrigin: 'top left',
          }}
          className="shadow-[0_24px_70px_-24px_rgba(4,24,18,.55)]"
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function VoucherPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useProfile();
  const toast = useToast();
  const pdfRef = useRef<HTMLDivElement>(null);
  const handledAction = useRef(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  const data = useLiveQuery(
    async () => {
      if (!id) return null;
      const expense = await db.expenses.get(id);
      if (!expense) return null;
      const category = (await db.categories.get(expense.categoryId)) ?? null;
      const isTravel = Boolean(expense.travelDetails) || category?.kind === 'travel';

      let travelExpenses: Expense[] = [];
      if (isTravel) {
        const sameDate = await db.expenses.where('date').equals(expense.date).toArray();
        travelExpenses = sameDate
          .filter((item) => Boolean(item.travelDetails))
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        if (!travelExpenses.some((item) => item.id === expense.id)) {
          travelExpenses = [expense, ...travelExpenses];
        }
      }

      return { expense, category, isTravel, travelExpenses };
    },
    [id],
    undefined,
  );

  const categoryName = data?.category?.name ?? 'অন্যান্য';
  const userName = user?.name ?? 'ব্যবহারকারী';
  const isTravel = Boolean(data?.isTravel);

  const downloadPdf = useCallback(async () => {
    if (!data || !pdfRef.current || pdfBusy) return;
    const { expense } = data;
    setPdfBusy(true);
    try {
      const delivery = await downloadVoucherPdf(pdfRef.current, {
        filename: isTravel
          ? `MyVoucher-Travel-${expense.date}.pdf`
          : `MyVoucher-${expense.date}-A4.pdf`,
        layout: isTravel ? 'a4-portrait' : 'a4-landscape-duplicate',
        dialogTitle: 'PDF সংরক্ষণ বা শেয়ার করুন',
      });
      toast.success(
        delivery === 'shared'
          ? 'PDF তৈরি হয়েছে। সংরক্ষণ বা শেয়ার করার অ্যাপ বেছে নিন।'
          : isTravel
            ? 'যাতায়াত ভাউচারের PDF ডাউনলোড হয়েছে।'
            : 'A4 ল্যান্ডস্কেপে দুই কপি ভাউচারের PDF ডাউনলোড হয়েছে।',
      );
    } catch (error) {
      console.error(error);
      toast.error('PDF তৈরি করা যায়নি। প্রিন্ট থেকে “Save as PDF” ব্যবহার করে দেখুন।');
    } finally {
      setPdfBusy(false);
    }
  }, [data, isTravel, pdfBusy, toast]);

  const printVoucher = useCallback(async () => {
    if (!data) return;
    if (isNativeApp()) {
      await downloadPdf();
      if (!pdfBusy) {
        toast.toast('PDF তৈরি হয়েছে। প্রিন্টারের জন্য উপযুক্ত অ্যাপ বেছে নিন।', 'info');
      }
      return;
    }
    printInLayout(isTravel ? 'a4-portrait' : 'a4-landscape');
  }, [data, downloadPdf, isTravel, pdfBusy, toast]);

  useEffect(() => {
    const action = searchParams.get('action');
    if (!action || !data || handledAction.current) return;
    handledAction.current = true;

    const timeout = window.setTimeout(() => {
      if (action === 'pdf') {
        void downloadPdf();
      } else if (action === 'print') {
        void printVoucher();
      }
      const next = new URLSearchParams(searchParams);
      next.delete('action');
      setSearchParams(next, { replace: true });
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [data, downloadPdf, printVoucher, searchParams, setSearchParams]);

  if (data === undefined) {
    return <LoadingScreen label="ভাউচার প্রস্তুত হচ্ছে…" />;
  }

  if (data === null) {
    return (
      <div className="card mx-auto mt-8 max-w-lg px-6 py-14 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-soft text-danger">
          <TriangleAlert size={24} />
        </div>
        <h1 className="mt-4 font-display text-xl font-bold">ভাউচারটি পাওয়া যায়নি</h1>
        <p className="mt-2 text-sm leading-7 text-muted">
          সংশ্লিষ্ট খরচটি মুছে ফেলা হয়েছে অথবা ঠিকানাটি ভুল। ভাউচার তালিকা থেকে আবার চেষ্টা করুন।
        </p>
        <Link to="/vouchers" className="btn btn-primary mt-6">
          <ArrowLeft size={16} /> ভাউচার তালিকায় যান
        </Link>
      </div>
    );
  }

  const { expense, travelExpenses } = data;
  const voucherExpenses = travelExpenses.length > 0 ? travelExpenses : [expense];

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="ভাউচার প্রিভিউ"
        title={isTravel ? 'A4 যাতায়াত ভাউচার' : 'A5 ভাউচার'}
        description={
          isTravel
            ? 'একই তারিখের সব যাতায়াত খরচ একটি A4 পোর্ট্রেট সারণিতে একসঙ্গে আসে। প্রিভিউ, PDF ও প্রিন্ট একই তথ্য দেখায়।'
            : 'চূড়ান্ত প্রিন্টের সঙ্গে মিলিয়ে প্রিভিউ। প্রিন্ট ও PDF-এ A4 ল্যান্ডস্কেপে পাশাপাশি দুই কপি থাকে, কেটে ব্যবহার করা যায়।'
        }
        actions={
          <>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn btn-ghost hidden sm:inline-flex"
            >
              <ArrowLeft size={16} /> ফিরে যান
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => void downloadPdf()}
              disabled={pdfBusy}
            >
              {pdfBusy ? <LoaderCircle size={16} className="animate-spin" /> : <Download size={16} />}
              {pdfBusy ? 'তৈরি হচ্ছে…' : 'PDF ডাউনলোড'}
            </button>
            <button type="button" className="btn btn-primary" onClick={() => void printVoucher()} disabled={pdfBusy}>
              <Printer size={16} /> প্রিন্ট
            </button>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,820px)_300px]">
        <section className="rounded-xl2 border border-line bg-[#d7d0c2] p-3 shadow-inner dark:bg-[#09110e] sm:p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
            <span className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-[#4f554f] dark:text-muted">
              {isTravel ? <FileSpreadsheet size={13} /> : <FileText size={13} />}
              {isTravel ? 'A4 · ২১০ × ২৯৭ মিমি' : 'A5 · ১৪৮ × ২১০ মিমি'}
            </span>
            <span className="rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-semibold text-[#3d433e] dark:bg-white/10 dark:text-muted">
              {isTravel ? 'পোর্ট্রেট · সব যাত্রা একসঙ্গে' : 'প্রিন্টে A4 ল্যান্ডস্কেপ · ২ কপি'}
            </span>
          </div>
          <ScaledSheet>
            {isTravel ? (
              <TravelVoucherDocument
                expenses={voucherExpenses}
                categoryName={categoryName}
                userName={userName}
              />
            ) : (
              <VoucherDocument
                expense={expense}
                categoryName={categoryName}
                userName={userName}
              />
            )}
          </ScaledSheet>
        </section>

        <aside className="space-y-3">
          <div className="card p-4">
            <h2 className="font-display text-base font-bold">প্রিন্টের জন্য প্রস্তুত</h2>
            <ul className="mt-3 space-y-2.5 text-[12px] leading-6 text-muted">
              {isTravel ? (
                <>
                  <li className="flex gap-2">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                    A4 পোর্ট্রেট, ২১০ × ২৯৭ মিমি।
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                    একই তারিখের {voucherExpenses.length}টি যাত্রা একটি সারণিতে একসঙ্গে।
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                    PDF তৈরি সম্পূর্ণ অফলাইনে হয়, বাংলা ফন্ট অ্যাপের সঙ্গে বান্ডল করা।
                  </li>
                </>
              ) : (
                <>
                  <li className="flex gap-2">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                    A5 পোর্ট্রেট প্রিভিউ, ১৪৮ × ২১০ মিমি।
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                    প্রিন্ট ও PDF-এ A4 ল্যান্ডস্কেপে পাশাপাশি দুই কপি।
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                    PDF তৈরি সম্পূর্ণ অফলাইনে হয়, বাংলা ফন্ট অ্যাপের সঙ্গে বান্ডল করা।
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                    প্রিন্টে শুধু ভাউচার যাবে; অ্যাপের মেনু ও বোতাম বাদ যাবে।
                  </li>
                </>
              )}
            </ul>
          </div>

          <div className="rounded-xl border border-accent/25 bg-accent-soft/55 p-4">
            <p className="text-[11px] font-semibold text-ink">ভাউচারের তথ্য</p>
            <dl className="mt-2 space-y-1.5 text-[11.5px]">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">তারিখ</dt>
                <dd className="font-medium">
                  {isTravel ? formatDateBn(expense.date) : formatVoucherDate(expense.date)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">খাত</dt>
                <dd className="truncate font-medium">{categoryName}</dd>
              </div>
              {isTravel && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">যাত্রা</dt>
                  <dd className="font-medium">{voucherExpenses.length}টি</dd>
                </div>
              )}
            </dl>
            <p className="mt-3 border-t border-accent/20 pt-2.5 text-[10.5px] leading-5 text-muted">
              খরচ সম্পাদনা করলে এই ভাউচারও সঙ্গে সঙ্গে হালনাগাদ হবে।
            </p>
          </div>

          <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary w-full sm:hidden">
            <ArrowLeft size={16} /> ফিরে যান
          </button>
        </aside>
      </div>

      {createPortal(
        isTravel ? (
          <div className="print-only print-sheet print-sheet-portrait" aria-hidden="true">
            <TravelVoucherDocument
              expenses={voucherExpenses}
              categoryName={categoryName}
              userName={userName}
            />
          </div>
        ) : (
          <div className="print-only print-sheet print-sheet-landscape" aria-hidden="true">
            <VoucherDocument expense={expense} categoryName={categoryName} userName={userName} />
            <VoucherDocument expense={expense} categoryName={categoryName} userName={userName} />
          </div>
        ),
        document.body,
      )}

      <div ref={pdfRef} className="pdf-render-wrap pdf-only" aria-hidden="true">
        {isTravel ? (
          <TravelVoucherDocument
            expenses={voucherExpenses}
            categoryName={categoryName}
            userName={userName}
          />
        ) : (
          <VoucherDocument expense={expense} categoryName={categoryName} userName={userName} />
        )}
      </div>
    </div>
  );
}
