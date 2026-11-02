import { useRef, useState, type ChangeEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  Database,
  Download,
  FileJson,
  FileSpreadsheet,
  HardDrive,
  Info,
  LoaderCircle,
  ShieldCheck,
  UploadCloud,
  X,
} from 'lucide-react';
import { db } from '../db/database';
import {
  BackupValidationError,
  backupFilename,
  createBackupPayload,
  downloadJson,
  restoreBackup,
  summarizeBackup,
  validateBackup,
} from '../db/backupService';
import { setMetadata } from '../db/settingsService';
import { exportExpensesCsv } from '../lib/csv';
import type { BackupPayload, BackupSummary } from '../db/types';
import { PageHeader } from '../components/ui/PageHeader';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../providers/ToastProvider';
import { formatDateTimeBn, formatLongDateBn } from '../lib/dates';
import { formatNumber } from '../lib/format';
import { APP_VERSION } from '../lib/constants';

const MAX_BACKUP_SIZE = 25 * 1024 * 1024;

export function BackupPage() {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [readBusy, setReadBusy] = useState(false);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [restoreError, setRestoreError] = useState('');
  const [pendingBackup, setPendingBackup] = useState<BackupPayload | null>(null);
  const [summary, setSummary] = useState<BackupSummary | null>(null);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [fileName, setFileName] = useState('');
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [replaceConfirmed, setReplaceConfirmed] = useState(false);
  const [confirmReplaceOpen, setConfirmReplaceOpen] = useState(false);

  const data = useLiveQuery(async () => {
    const [expenses, categories, lastBackup, estimate] = await Promise.all([
      db.expenses.toArray(),
      db.categories.toArray(),
      db.metadata.get('lastBackupAt'),
      navigator.storage?.estimate?.().catch(() => undefined),
    ]);
    return {
      expenses,
      categories,
      lastBackupAt: lastBackup?.value,
      usage: estimate?.usage ?? 0,
      quota: estimate?.quota ?? 0,
      dbVersion: db.verno,
    };
  }, []);

  const handleExportJson = async () => {
    setExportBusy(true);
    try {
      const payload = await createBackupPayload();
      downloadJson(payload, backupFilename(payload.exportedAt));
      await setMetadata('lastBackupAt', payload.exportedAt);
      toast.success('JSON ব্যাকআপ ডাউনলোড হয়েছে। নিরাপদ জায়গায় সংরক্ষণ করুন।');
    } catch (error) {
      console.error(error);
      toast.error('ব্যাকআপ তৈরি করা যায়নি। আবার চেষ্টা করুন।');
    } finally {
      setExportBusy(false);
    }
  };

  const handleExportCsv = () => {
    if (!data) return;
    try {
      exportExpensesCsv(data.expenses, data.categories);
      toast.success('CSV ফাইল ডাউনলোড হয়েছে।');
    } catch (error) {
      console.error(error);
      toast.error('CSV তৈরি করা যায়নি।');
    }
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setRestoreError('');
    setPendingBackup(null);
    setSummary(null);
    setRestoreModalOpen(false);
    setMode('merge');
    setReplaceConfirmed(false);
    setFileName(file.name);

    if (file.size > MAX_BACKUP_SIZE) {
      setRestoreError('ফাইলটি ২৫ MB-এর বেশি। নিরাপত্তার জন্য বড় ফাইল গ্রহণ করা হয় না।');
      return;
    }

    setReadBusy(true);
    try {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new BackupValidationError('ফাইলটি বৈধ JSON নয়।');
      }
      const validated = validateBackup(parsed);
      setPendingBackup(validated);
      setSummary(summarizeBackup(validated));
    } catch (error) {
      setRestoreError(
        error instanceof BackupValidationError
          ? error.message
          : 'ব্যাকআপ ফাইল পড়া যায়নি বা ফাইলটি ক্ষতিগ্রস্ত।',
      );
    } finally {
      setReadBusy(false);
    }
  };

  const resetRestore = () => {
    if (restoreBusy) return;
    setPendingBackup(null);
    setSummary(null);
    setRestoreError('');
    setFileName('');
    setRestoreModalOpen(false);
    setMode('merge');
    setReplaceConfirmed(false);
    setConfirmReplaceOpen(false);
  };

  const executeRestore = async () => {
    if (!pendingBackup) return;
    setRestoreBusy(true);
    try {
      await restoreBackup(pendingBackup, mode);
      toast.success(
        mode === 'replace'
          ? 'ব্যাকআপ দিয়ে আগের সব তথ্য প্রতিস্থাপন করা হয়েছে।'
          : 'ব্যাকআপের তথ্য বিদ্যমান ডেটার সঙ্গে যুক্ত হয়েছে।',
      );
      resetRestore();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'রিস্টোর সম্পন্ন করা যায়নি। আগের ডেটা অক্ষত আছে।',
      );
    } finally {
      setRestoreBusy(false);
      setConfirmReplaceOpen(false);
    }
  };

  const requestRestore = () => {
    if (!pendingBackup) return;
    if (mode === 'replace') {
      if (!replaceConfirmed) return;
      setConfirmReplaceOpen(true);
    } else {
      void executeRestore();
    }
  };

  const storagePercent =
    data && data.quota > 0 ? Math.min((data.usage / data.quota) * 100, 100) : null;

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="ব্যাকআপ ও রিস্টোর"
        title="আপনার তথ্য সুরক্ষিত রাখুন"
        description="সম্পূর্ণ ডেটাবেজ এক ফাইলে ব্যাকআপ নিন, প্রয়োজনে পুনরুদ্ধার করুন অথবা Excel-এ ব্যবহারের জন্য CSV ডাউনলোড করুন।"
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <Database size={17} />
          </span>
          <p className="mt-3 text-[11px] text-muted">সংরক্ষিত খরচ</p>
          <p className="mt-1 font-display text-xl font-bold">{formatNumber(data?.expenses.length ?? 0)}</p>
        </div>
        <div className="card p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <HardDrive size={17} />
          </span>
          <p className="mt-3 text-[11px] text-muted">ডেটাবেজ সংস্করণ</p>
          <p className="mt-1 font-display text-xl font-bold">
            v{data?.dbVersion ?? '—'}
          </p>
          <p className="mt-1 text-[10px] text-muted">অ্যাপ v{APP_VERSION}</p>
        </div>
        <div className="card p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-raised text-muted">
            <ShieldCheck size={17} />
          </span>
          <p className="mt-3 text-[11px] text-muted">সর্বশেষ ব্যাকআপ</p>
          <p className="mt-1 text-[12.5px] font-semibold">
            {data?.lastBackupAt ? formatDateTimeBn(data.lastBackupAt) : 'এখনো নেওয়া হয়নি'}
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <FileJson size={20} />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold">সম্পূর্ণ JSON ব্যাকআপ</h2>
              <p className="mt-1 text-[12.5px] leading-6 text-muted">
                ব্যবহারকারী, খরচ, খাত, সেটিংস ও ভাউচার-সংক্রান্ত সব তথ্য এক ফাইলে সংরক্ষণ হবে।
              </p>
            </div>
          </div>
          <ul className="mt-4 space-y-1.5 text-[11.5px] text-muted">
            <li className="flex gap-2"><CheckCircle2 size={13} className="mt-0.5 text-primary" /> ব্যাকআপের তারিখ ও সংস্করণ অন্তর্ভুক্ত</li>
            <li className="flex gap-2"><CheckCircle2 size={13} className="mt-0.5 text-primary" /> সম্পূর্ণ অফলাইনে তৈরি হয়</li>
            <li className="flex gap-2"><CheckCircle2 size={13} className="mt-0.5 text-primary" /> পরে যেকোনো ডিভাইসে রিস্টোর করা যাবে</li>
          </ul>
          <button
            type="button"
            className="btn btn-primary mt-5 w-full"
            onClick={() => void handleExportJson()}
            disabled={exportBusy}
          >
            {exportBusy ? <LoaderCircle size={16} className="animate-spin" /> : <Download size={16} />}
            {exportBusy ? 'ব্যাকআপ তৈরি হচ্ছে…' : 'JSON ব্যাকআপ ডাউনলোড'}
          </button>
        </section>

        <section className="card p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <FileSpreadsheet size={20} />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold">CSV এক্সপোর্ট</h2>
              <p className="mt-1 text-[12.5px] leading-6 text-muted">
                সব খরচ Excel বা Google Sheets-এ খোলার জন্য ডাউনলোড করুন। বাংলা লেখা সমর্থিত।
              </p>
            </div>
          </div>
          <ul className="mt-4 space-y-1.5 text-[11.5px] text-muted">
            <li className="flex gap-2"><CheckCircle2 size={13} className="mt-0.5 text-primary" /> UTF-8 BOM — Excel-এ বাংলা ঠিক দেখাবে</li>
            <li className="flex gap-2"><CheckCircle2 size={13} className="mt-0.5 text-primary" /> তারিখ, খাত, বিবরণ, পরিমাণ ও মোট টাকা</li>
            <li className="flex gap-2"><CheckCircle2 size={13} className="mt-0.5 text-primary" /> ফাইল: MyVoucher-Expenses-তারিখ.csv</li>
          </ul>
          <button
            type="button"
            className="btn btn-secondary mt-5 w-full"
            onClick={handleExportCsv}
            disabled={!data || data.expenses.length === 0}
          >
            <Download size={16} /> CSV ডাউনলোড
          </button>
        </section>
      </div>

      <section className="card mt-5 overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-raised text-ink">
              <UploadCloud size={20} />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold">ব্যাকআপ থেকে রিস্টোর</h2>
              <p className="mt-1 text-[12.5px] leading-6 text-muted">
                MyVoucher JSON ব্যাকআপ নির্বাচন করুন। ফাইল যাচাইয়ের পরই কোনো পরিবর্তন হবে।
              </p>
            </div>
          </div>
        </div>
        <div className="p-5">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="sr-only"
            onChange={(event) => void handleFile(event)}
            id="backup-file"
          />
          <label
            htmlFor="backup-file"
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-line bg-raised/25 px-5 py-8 text-center transition-colors hover:border-primary/40 hover:bg-primary-soft/25"
          >
            {readBusy ? (
              <LoaderCircle size={26} className="animate-spin text-primary" />
            ) : (
              <UploadCloud size={26} className="text-muted" />
            )}
            <span className="mt-2 text-[13px] font-semibold text-ink">
              {readBusy ? 'ফাইল যাচাই হচ্ছে…' : 'JSON ব্যাকআপ ফাইল নির্বাচন করুন'}
            </span>
            <span className="mt-1 text-[11px] text-muted">সর্বোচ্চ ২৫ MB · শুধু .json</span>
          </label>

          {fileName && !pendingBackup && !restoreError && (
            <p className="mt-3 text-[11.5px] text-muted">{fileName}</p>
          )}
          {restoreError && (
            <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-danger/20 bg-danger-soft px-3.5 py-3 text-[12px] leading-6 text-danger">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span className="flex-1">{restoreError}</span>
              <button type="button" className="icon-btn h-6 w-6" onClick={resetRestore}>
                <X size={13} />
              </button>
            </div>
          )}
          {pendingBackup && summary && (
            <div className="mt-3 flex flex-col gap-3 rounded-lg border border-primary/20 bg-primary-soft/40 p-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-primary" />
                <div>
                  <p className="text-[12.5px] font-semibold text-ink">ব্যাকআপ ফাইল যাচাই সম্পন্ন</p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {fileName} · {formatDateTimeBn(summary.exportedAt)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary h-9 min-h-0 px-3 text-[12px]"
                onClick={() => {
                  setMode('merge');
                  setReplaceConfirmed(false);
                  setRestoreModalOpen(true);
                }}
              >
                রিস্টোর শুরু করুন
              </button>
            </div>
          )}

          {summary && pendingBackup && (
            <div className="mt-4 rounded-lg border border-line p-4">
              <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
                <div>
                  <p className="text-[10px] text-muted">ব্যাকআপের তারিখ</p>
                  <p className="mt-1 text-[11.5px] font-semibold">
                    {formatLongDateBn(new Date(summary.exportedAt))}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted">খরচ</p>
                  <p className="mt-1 text-[13px] font-bold">{formatNumber(summary.expenseCount)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted">খাত</p>
                  <p className="mt-1 text-[13px] font-bold">{formatNumber(summary.categoryCount)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted">সংস্করণ</p>
                  <p className="mt-1 text-[11.5px] font-semibold">
                    অ্যাপ {summary.appVersion} · DB {summary.databaseVersion}
                  </p>
                </div>
              </div>
            </div>
          )}

          {summary && pendingBackup && (
            <Modal
              open={restoreModalOpen}
              onClose={restoreBusy ? () => undefined : () => setRestoreModalOpen(false)}
              title="রিস্টোরের ধরন বেছে নিন"
              description="আপনার বর্তমান তথ্য কীভাবে ব্যাকআপের সঙ্গে মেলানো হবে তা নির্ধারণ করুন।"
              size="md"
              dismissible={!restoreBusy}
              footer={
                <>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setRestoreModalOpen(false)}
                    disabled={restoreBusy}
                  >
                    বাতিল
                  </button>
                  <button
                    type="button"
                    className={mode === 'replace' ? 'btn btn-danger' : 'btn btn-primary'}
                    onClick={requestRestore}
                    disabled={restoreBusy || (mode === 'replace' && !replaceConfirmed)}
                  >
                    {restoreBusy ? 'রিস্টোর হচ্ছে…' : mode === 'replace' ? 'সব প্রতিস্থাপন করুন' : 'ডেটা যুক্ত করুন'}
                  </button>
                </>
              }
            >
              <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg border border-line bg-raised/35 p-3 text-center sm:grid-cols-4">
                <div>
                  <p className="text-[9.5px] text-muted">ব্যাকআপের তারিখ</p>
                  <p className="mt-0.5 text-[10.5px] font-semibold">
                    {formatLongDateBn(new Date(summary.exportedAt))}
                  </p>
                </div>
                <div>
                  <p className="text-[9.5px] text-muted">খরচ</p>
                  <p className="mt-0.5 text-[12px] font-bold">{formatNumber(summary.expenseCount)}</p>
                </div>
                <div>
                  <p className="text-[9.5px] text-muted">খাত</p>
                  <p className="mt-0.5 text-[12px] font-bold">{formatNumber(summary.categoryCount)}</p>
                </div>
                <div>
                  <p className="text-[9.5px] text-muted">সংস্করণ</p>
                  <p className="mt-0.5 text-[10.5px] font-semibold">v{summary.databaseVersion}</p>
                </div>
              </div>
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setMode('merge');
                    setReplaceConfirmed(false);
                  }}
                  className={`w-full rounded-xl border p-4 text-left transition-colors ${
                    mode === 'merge'
                      ? 'border-primary bg-primary-soft/40 ring-1 ring-primary/20'
                      : 'border-line hover:bg-raised/40'
                  }`}
                  aria-pressed={mode === 'merge'}
                >
                  <span className="flex items-start gap-3">
                    <ArrowLeftRight size={18} className="mt-0.5 shrink-0 text-primary" />
                    <span>
                      <span className="block text-[13px] font-semibold text-ink">একত্র করুন (নিরাপদ)</span>
                      <span className="mt-1 block text-[11.5px] leading-6 text-muted">
                        ব্যাকআপের রেকর্ডগুলো আইডি অনুযায়ী যোগ হবে। একই আইডির রেকর্ড থাকলে ব্যাকআপের
                        সংস্করণ ব্যবহৃত হবে। বর্তমান প্রোফাইল অপরিবর্তিত থাকবে।
                      </span>
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('replace')}
                  className={`w-full rounded-xl border p-4 text-left transition-colors ${
                    mode === 'replace'
                      ? 'border-danger/60 bg-danger-soft/40 ring-1 ring-danger/20'
                      : 'border-line hover:bg-raised/40'
                  }`}
                  aria-pressed={mode === 'replace'}
                >
                  <span className="flex items-start gap-3">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0 text-danger" />
                    <span>
                      <span className="block text-[13px] font-semibold text-ink">সম্পূর্ণ প্রতিস্থাপন</span>
                      <span className="mt-1 block text-[11.5px] leading-6 text-muted">
                        বর্তমান সব খরচ, খাত, প্রোফাইল ও সেটিংস মুছে ব্যাকআপের তথ্য বসানো হবে। এটি
                        ফিরিয়ে আনা যাবে না।
                      </span>
                    </span>
                  </span>
                </button>

                {mode === 'replace' && (
                  <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-danger/20 bg-danger-soft/40 p-3.5">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 accent-[rgb(var(--danger))]"
                      checked={replaceConfirmed}
                      onChange={(event) => setReplaceConfirmed(event.target.checked)}
                    />
                    <span className="text-[12px] leading-6 text-ink">
                      আমি বুঝেছি যে বর্তমান সব ডেটা স্থায়ীভাবে প্রতিস্থাপিত হবে এবং আগে প্রয়োজনে
                      আলাদা ব্যাকআপ নিতে পারি।
                    </span>
                  </label>
                )}
              </div>
            </Modal>
          )}
        </div>
      </section>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-surface/60 p-4">
          <p className="flex items-center gap-2 text-[12px] font-semibold text-ink">
            <Info size={15} /> ডেটা কোথায় থাকে?
          </p>
          <p className="mt-1.5 text-[11px] leading-6 text-muted">
            সব তথ্য এই ব্রাউজার/অ্যাপের IndexedDB-তে থাকে। ব্রাউজার ডেটা মুছলে, অ্যাপ আনইনস্টল করলে
            বা ফোনের অ্যাপ ডেটা ক্লিয়ার করলে রেকর্ড হারাতে পারে। নিয়মিত JSON ব্যাকআপ রাখুন।
          </p>
        </div>
        <div className="rounded-xl border border-line bg-surface/60 p-4">
          <p className="flex items-center gap-2 text-[12px] font-semibold text-ink">
            <HardDrive size={15} /> ডিভাইস স্টোরেজ
          </p>
          {storagePercent !== null ? (
            <>
              <p className="mt-1.5 text-[11px] text-muted">
                ব্যবহার: {(data?.usage ?? 0) / 1024 < 1024
                  ? `${formatNumber(Math.round((data?.usage ?? 0) / 1024))} KB`
                  : `${formatNumber(Math.round((data?.usage ?? 0) / 1024 / 1024))} MB`}
                {' · '}বরাদ্দের {storagePercent.toFixed(2)}%
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-raised">
                <div className="h-full rounded-full bg-primary" style={{ width: `${storagePercent}%` }} />
              </div>
            </>
          ) : (
            <p className="mt-1.5 text-[11px] leading-6 text-muted">
              আপনার ব্রাউজার স্টোরেজের বিস্তারিত তথ্য দিচ্ছে না। ব্যাকআপ নেওয়া এখনও সম্ভব।
            </p>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmReplaceOpen}
        title="সব ডেটা প্রতিস্থাপন নিশ্চিত?"
        description="এই কাজটি করার পর বর্তমান সব খরচ, খাত ও প্রোফাইল মুছে ব্যাকআপের তথ্য পুনরুদ্ধার হবে। নিশ্চিত হলে এগিয়ে যান।"
        confirmLabel="হ্যাঁ, প্রতিস্থাপন করুন"
        busy={restoreBusy}
        onConfirm={() => void executeRestore()}
        onClose={() => setConfirmReplaceOpen(false)}
      />
    </div>
  );
}
