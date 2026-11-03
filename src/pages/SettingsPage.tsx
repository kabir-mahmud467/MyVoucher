import { useEffect, useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ArrowRight,
  BadgeCheck,
  CloudOff,
  Database,
  Download,
  HardDrive,
  Info,
  Laptop,
  Moon,
  Pencil,
  ShieldCheck,
  Smartphone,
  Sun,
  UserRound,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from '../db/database';
import { updateUserName } from '../db/userService';
import { useProfile } from '../providers/ProfileProvider';
import { useTheme } from '../providers/ThemeProvider';
import { useToast } from '../providers/ToastProvider';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { PageHeader } from '../components/ui/PageHeader';
import { Modal } from '../components/ui/Modal';
import { BackupPage } from './BackupPage';
import { validateUserName } from '../lib/validation';
import { APP_ID, APP_VERSION } from '../lib/constants';
import { formatNumber } from '../lib/format';
import { formatDateTimeBn } from '../lib/dates';
import { isNativeApp } from '../lib/native';

export function SettingsPage() {
  const { user } = useProfile();
  const { theme, setTheme } = useTheme();
  const toast = useToast();
  const { canInstall, isInstalled, promptInstall } = useInstallPrompt();
  const native = isNativeApp();
  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [nameError, setNameError] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);

  const data = useLiveQuery(async () => {
    const [expenses, categories, lastBackup] = await Promise.all([
      db.expenses.count(),
      db.categories.count(),
      db.metadata.get('lastBackupAt'),
    ]);
    return {
      expenseCount: expenses,
      categoryCount: categories,
      lastBackupAt: lastBackup?.value,
      dbVersion: db.verno,
    };
  }, []);

  useEffect(() => {
    setName(user?.name ?? '');
  }, [user?.name]);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const handleSaveName = async (event: FormEvent) => {
    event.preventDefault();
    const error = validateUserName(name);
    if (error) {
      setNameError(error);
      return;
    }
    setSavingName(true);
    try {
      await updateUserName(name);
      toast.success('আপনার নাম হালনাগাদ হয়েছে। নতুন ভাউচারে এই নাম দেখা যাবে।');
      setNameModalOpen(false);
    } catch (caught) {
      setNameError(caught instanceof Error ? caught.message : 'নাম সংরক্ষণ করা যায়নি।');
    } finally {
      setSavingName(false);
    }
  };

  const handleInstall = async () => {
    const result = await promptInstall();
    if (result === 'accepted') {
      toast.success('MyVoucher ইনস্টল শুরু হয়েছে।');
    } else if (result === 'unavailable') {
      toast.toast('এই ব্রাউজার থেকে সরাসরি ইনস্টল প্রম্পট পাওয়া যাচ্ছে না। ইনস্টল পৃষ্ঠার নির্দেশনা দেখুন।', 'info');
    }
  };

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="সেটিংস"
        title="অ্যাপ সেটিংস"
        description={
          native
            ? 'আপনার প্রোফাইল, চেহারা ও ডেটা সংক্রান্ত তথ্য এখানে নিয়ন্ত্রণ করুন।'
            : 'আপনার প্রোফাইল, চেহারা, ইনস্টলেশন ও ডেটা সংক্রান্ত তথ্য এখানে নিয়ন্ত্রণ করুন।'
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <div className="space-y-5">
          <section className="card p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft font-display text-lg font-bold text-primary">
                  {user?.name?.charAt(0) ?? 'M'}
                </span>
                <div>
                  <h2 className="font-display text-lg font-bold">ব্যবহারকারীর প্রোফাইল</h2>
                  <p className="mt-0.5 text-[11.5px] text-muted">এই ডিভাইসে একজন ব্যবহারকারী</p>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary h-9 min-h-0 px-3 text-[12px]"
                onClick={() => {
                  setNameError('');
                  setNameModalOpen(true);
                }}
              >
                <Pencil size={13} /> নাম বদলান
              </button>
            </div>
            <div className="mt-4 rounded-lg border border-line bg-raised/35 px-4 py-3">
              <p className="text-[10.5px] text-muted">নিবন্ধিত নাম</p>
              <p className="mt-0.5 text-[14px] font-semibold text-ink">{user?.name ?? '—'}</p>
              <p className="mt-2 text-[10.5px] leading-5 text-muted">
                এই নামটি ভাউচারের “প্রস্তুতকারীর স্বাক্ষর” অংশে যুক্ত হয়। ভাউচারে আলাদা কোনো
                ব্যবহারকারীর নামের ঘর নেই।
              </p>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="font-display text-lg font-bold">অ্যাপের চেহারা</h2>
            <p className="mt-1 text-[11.5px] text-muted">আপনার পছন্দের থিম নির্বাচন করুন।</p>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => void setTheme('light')}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  theme === 'light'
                    ? 'border-primary bg-primary-soft/45 ring-1 ring-primary/20'
                    : 'border-line hover:bg-raised/40'
                }`}
                aria-pressed={theme === 'light'}
              >
                <span className="flex items-center justify-between">
                  <Sun size={18} className="text-accent" />
                  {theme === 'light' && <BadgeCheck size={16} className="text-primary" />}
                </span>
                <span className="mt-2 block text-[12.5px] font-semibold">হালকা</span>
                <span className="mt-0.5 block text-[10px] text-muted">দিনের আলোয় আরামদায়ক</span>
              </button>
              <button
                type="button"
                onClick={() => void setTheme('dark')}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  theme === 'dark'
                    ? 'border-primary bg-primary-soft/45 ring-1 ring-primary/20'
                    : 'border-line hover:bg-raised/40'
                }`}
                aria-pressed={theme === 'dark'}
              >
                <span className="flex items-center justify-between">
                  <Moon size={18} className="text-primary" />
                  {theme === 'dark' && <BadgeCheck size={16} className="text-primary" />}
                </span>
                <span className="mt-2 block text-[12.5px] font-semibold">গাঢ়</span>
                <span className="mt-0.5 block text-[10px] text-muted">রাতে চোখের জন্য আরাম</span>
              </button>
            </div>
          </section>

          {!native && (
            <section className="card p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Smartphone size={19} />
                </span>
                <div className="flex-1">
                  <h2 className="font-display text-lg font-bold">অ্যাপ ইনস্টলেশন</h2>
                  <p className="mt-1 text-[11.5px] leading-6 text-muted">
                    PWA হিসেবে ইনস্টল করলে হোম স্ক্রিন থেকে অফলাইনে খোলা যাবে। Android APK-এর জন্য
                    ইনস্টল পৃষ্ঠার নির্দেশনা দেখুন।
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {isInstalled ? (
                      <span className="chip border-primary/20 bg-primary-soft text-primary">
                        <BadgeCheck size={13} /> ইনস্টল করা আছে
                      </span>
                    ) : canInstall ? (
                      <button
                        type="button"
                        className="btn btn-primary h-9 min-h-0 text-[12px]"
                        onClick={() => void handleInstall()}
                      >
                        <Download size={14} /> এখনই ইনস্টল করুন
                      </button>
                    ) : (
                      <span className="chip">
                        <Laptop size={13} /> ব্রাউজারের ইনস্টল মেনু ব্যবহার করুন
                      </span>
                    )}
                    <Link to="/install" className="btn btn-secondary h-9 min-h-0 text-[12px]">
                      ইনস্টল নির্দেশনা <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          )}

          <section className="card p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-raised text-muted">
                <CloudOff size={19} />
              </span>
              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-display text-lg font-bold">Google Drive ব্যাকআপ</h2>
                  <span className="chip">ভবিষ্যৎ সংস্করণ</span>
                </div>
                <p className="mt-1 text-[11.5px] leading-6 text-muted">
                  ক্লাউড ব্যাকআপ ভবিষ্যতে ঐচ্ছিকভাবে যুক্ত হবে। বর্তমানে MyVoucher সম্পূর্ণ অফলাইন
                  এবং Google-এর সঙ্গে কোনো ডেটা শেয়ার করে না। নিচের ব্যাকআপ অংশ থেকে JSON ব্যাকআপ
                  ফাইল নিজে সংরক্ষণ করুন।
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className="card overflow-hidden">
            <div className="border-b border-line px-5 py-4">
              <h2 className="font-display text-lg font-bold">অ্যাপের তথ্য</h2>
            </div>
            <dl className="divide-y divide-line text-[12px]">
              <div className="flex items-center justify-between gap-3 px-5 py-3">
                <dt className="flex items-center gap-2 text-muted"><Info size={14} /> সংস্করণ</dt>
                <dd className="font-semibold">v{APP_VERSION}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 px-5 py-3">
                <dt className="flex items-center gap-2 text-muted"><Database size={14} /> ডেটাবেজ</dt>
                <dd className="font-semibold">MyVoucherDB v{data?.dbVersion ?? '—'}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 px-5 py-3">
                <dt className="flex items-center gap-2 text-muted"><HardDrive size={14} /> রেকর্ড</dt>
                <dd className="font-semibold">
                  {formatNumber(data?.expenseCount ?? 0)} খরচ · {formatNumber(data?.categoryCount ?? 0)} খাত
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 px-5 py-3">
                <dt className="flex items-center gap-2 text-muted"><ShieldCheck size={14} /> সর্বশেষ ব্যাকআপ</dt>
                <dd className="text-right font-semibold">
                  {data?.lastBackupAt ? formatDateTimeBn(data.lastBackupAt) : 'নেওয়া হয়নি'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 px-5 py-3">
                <dt className="flex items-center gap-2 text-muted"><UserRound size={14} /> অ্যাপ আইডি</dt>
                <dd className="break-all text-right text-[10.5px] font-medium text-muted">{APP_ID}</dd>
              </div>
            </dl>
          </section>

          <section className="card p-5">
            <h2 className="font-display text-lg font-bold">সংযোগ</h2>
            <div className="mt-3 flex items-center justify-between rounded-lg border border-line bg-raised/35 px-3.5 py-3">
              <span className="flex items-center gap-2 text-[12px]">
                {online ? <Wifi size={15} className="text-primary" /> : <WifiOff size={15} className="text-accent" />}
                {online ? 'ইন্টারনেট সংযুক্ত' : 'অফলাইনে চলছে'}
              </span>
              <span className={`chip ${online ? 'text-primary' : 'text-accent'}`}>
                {online ? 'অনলাইন' : 'অফলাইন'}
              </span>
            </div>
            <p className="mt-3 text-[10.5px] leading-6 text-muted">
              খরচ, ভাউচার, PDF, ব্যাকআপ—সবকিছুর মূল কাজ ইন্টারনেট ছাড়াই চলে। ইন্টারনেট শুধু
              প্রথমবার PWA ক্যাশ করতে বা অ্যাপ আপডেট পেতে প্রয়োজন হতে পারে।
            </p>
          </section>

          <section className="rounded-xl border border-primary/20 bg-primary-soft/45 p-5">
            <ShieldCheck size={19} className="text-primary" />
            <h2 className="mt-2 font-display text-base font-bold">গোপনীয়তা</h2>
            <p className="mt-1 text-[11px] leading-6 text-muted">
              কোনো আর্থিক রেকর্ড কোথাও পাঠানো হয় না। কোনো ট্র্যাকিং বা বিজ্ঞাপন নেই। আপনার
              ব্রাউজার/অ্যাপের IndexedDB-ই একমাত্র প্রধান ডেটা উৎস।
            </p>
          </section>
        </div>
      </div>

      <section className="mt-5" id="backup">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <HardDrive size={17} />
          </span>
          <div>
            <h2 className="font-display text-lg font-bold">ব্যাকআপ ও রিস্টোর</h2>
            <p className="text-[11px] text-muted">JSON ব্যাকআপ, CSV এক্সপোর্ট ও ফাইল থেকে পুনরুদ্ধার।</p>
          </div>
        </div>
        <BackupPage embedded />
      </section>

      <Modal
        open={nameModalOpen}
        onClose={savingName ? () => undefined : () => setNameModalOpen(false)}
        title="নাম পরিবর্তন"
        description="নতুন নাম ভাউচারের প্রস্তুতকারীর স্বাক্ষর অংশে সঙ্গে সঙ্গে দেখা যাবে।"
        size="sm"
        dismissible={!savingName}
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setNameModalOpen(false)}
              disabled={savingName}
            >
              বাতিল
            </button>
            <button type="submit" form="profile-name-form" className="btn btn-primary" disabled={savingName}>
              {savingName ? 'সংরক্ষণ হচ্ছে…' : 'নাম সংরক্ষণ করুন'}
            </button>
          </>
        }
      >
        <form id="profile-name-form" onSubmit={handleSaveName} noValidate>
          <label htmlFor="profile-name" className="field-label">আপনার নাম</label>
          <input
            id="profile-name"
            type="text"
            className="field"
            maxLength={80}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setNameError('');
            }}
            aria-invalid={Boolean(nameError)}
            autoFocus
          />
          {nameError ? (
            <p className="field-error" role="alert">{nameError}</p>
          ) : (
            <p className="field-hint">এই নাম শুধু ভাউচারের স্বাক্ষর অংশে ব্যবহার হবে।</p>
          )}
        </form>
      </Modal>
    </div>
  );
}
