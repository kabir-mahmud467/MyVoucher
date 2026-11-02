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
  FileText,
  LoaderCircle,
  Printer,
  TriangleAlert,
} from 'lucide-react';
import { db } from '../db/database';
import { useProfile } from '../providers/ProfileProvider';
import { useToast } from '../providers/ToastProvider';
import { VoucherDocument } from '../components/vouchers/VoucherDocument';
import { PageHeader } from '../components/ui/PageHeader';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { downloadVoucherPdf } from '../lib/pdf';
import { formatVoucherDate } from '../lib/dates';
import { isNativeApp } from '../lib/native';

function ScaledVoucher({ children }: { children: ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState({ width: 559, height: 794, scale: 1 });

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
          style={{ transform: `scale(${metrics.scale})`, transformOrigin: 'top left' }}
          className="w-[148mm] shadow-[0_24px_70px_-24px_rgba(4,24,18,.55)]"
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

  const data = useLiveQuery(async () => {
    if (!id) return null;
    const expense = await db.expenses.get(id);
    if (!expense) return null;
    const category = await db.categories.get(expense.categoryId);
    return { expense, category: category ?? null };
  }, [id], undefined);

  const categoryName = data?.category?.name ?? 'অন্যান্য';
  const userName = user?.name ?? 'ব্যবহারকারী';

  const printVoucher = useCallback(async () => {
    if (!data) return;
    if (isNativeApp()) {
      if (!pdfRef.current || pdfBusy) return;
      setPdfBusy(true);
      try {
        await downloadVoucherPdf(pdfRef.current, data.expense, {
          dialogTitle: 'প্রিন্ট করার অ্যাপ বেছে নিন',
        });
        toast.toast('PDF তৈরি হয়েছে। প্রিন্টারের জন্য উপযুক্ত অ্যাপ বেছে নিন।', 'info');
      } catch (error) {
        console.error(error);
        toast.error('প্রিন্ট ফাইল তৈরি করা যায়নি। আবার চেষ্টা করুন।');
      } finally {
        setPdfBusy(false);
      }
      return;
    }
    const previousTitle = document.title;
    document.title = `MyVoucher-Voucher-${data.expense.date}`;
    window.print();
    window.setTimeout(() => {
      document.title = previousTitle;
    }, 1000);
  }, [data, pdfBusy, toast]);

  const downloadPdf = useCallback(async () => {
    if (!data || !pdfRef.current || pdfBusy) return;
    setPdfBusy(true);
    try {
      const delivery = await downloadVoucherPdf(pdfRef.current, data.expense);
      toast.success(
        delivery === 'shared'
          ? 'PDF তৈরি হয়েছে। সংরক্ষণ বা শেয়ার করার অ্যাপ বেছে নিন।'
          : 'ভাউচারের PDF ডাউনলোড হয়েছে।',
      );
    } catch (error) {
      console.error(error);
      toast.error('PDF তৈরি করা যায়নি। প্রিন্ট থেকে “Save as PDF” ব্যবহার করে দেখুন।');
    } finally {
      setPdfBusy(false);
    }
  }, [data, pdfBusy, toast]);

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

  const { expense } = data;

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="ভাউচার প্রিভিউ"
        title="A5 ভাউচার"
        description="চূড়ান্ত প্রিন্টের সঙ্গে মিলিয়ে প্রিভিউ। ভাউচার সবসময় সংশ্লিষ্ট খরচের হালনাগাদ তথ্য দেখায়।"
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

      <div className="grid gap-5 xl:grid-cols-[minmax(0,780px)_300px]">
        <section className="rounded-xl2 border border-line bg-[#d7d0c2] p-3 shadow-inner dark:bg-[#09110e] sm:p-6">
          <div className="mb-3 flex items-center justify-between px-1">
            <span className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-[#4f554f] dark:text-muted">
              <FileText size={13} /> A5 · ১৪৮ × ২১০ মিমি
            </span>
            <span className="rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-semibold text-[#3d433e] dark:bg-white/10 dark:text-muted">
              পোর্ট্রেট
            </span>
          </div>
          <ScaledVoucher>
            <VoucherDocument
              expense={expense}
              categoryName={categoryName}
              userName={userName}
            />
          </ScaledVoucher>
        </section>

        <aside className="space-y-3">
          <div className="card p-4">
            <h2 className="font-display text-base font-bold">প্রিন্টের জন্য প্রস্তুত</h2>
            <ul className="mt-3 space-y-2.5 text-[12px] leading-6 text-muted">
              <li className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                A5 পোর্ট্রেট, ১৪৮ × ২১০ মিমি।
              </li>
              <li className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                PDF তৈরি সম্পূর্ণ অফলাইনে হয়, বাংলা ফন্ট অ্যাপের সঙ্গে বান্ডল করা।
              </li>
              <li className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                PDF ডাউনলোডে বাংলা লেখা ছবি হিসেবে রেন্ডার হয়, ফলে যেকোনো ডিভাইসে দেখা যায়।
              </li>
              <li className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                প্রিন্টে শুধু ভাউচার যাবে; অ্যাপের মেনু ও বোতাম বাদ যাবে।
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-accent/25 bg-accent-soft/55 p-4">
            <p className="text-[11px] font-semibold text-ink">ভাউচারের তথ্য</p>
            <dl className="mt-2 space-y-1.5 text-[11.5px]">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">তারিখ</dt>
                <dd className="font-medium">{formatVoucherDate(expense.date)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">খাত</dt>
                <dd className="truncate font-medium">{categoryName}</dd>
              </div>
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
        <div className="print-only" aria-hidden="true">
          <VoucherDocument expense={expense} categoryName={categoryName} userName={userName} />
        </div>,
        document.body,
      )}

      <div ref={pdfRef} className="pdf-render-wrap pdf-only" aria-hidden="true">
        <VoucherDocument expense={expense} categoryName={categoryName} userName={userName} />
      </div>
    </div>
  );
}
