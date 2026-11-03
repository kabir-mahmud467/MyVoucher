import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  ArrowDownToLine,
  BadgeCheck,
  CheckCircle2,
  Download,
  Info,
  Laptop,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Tablet,
  WifiOff,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { useToast } from '../providers/ToastProvider';
import { APP_VERSION } from '../lib/constants';
import { isNativeApp } from '../lib/native';

type Tab = 'web' | 'android' | 'safety';

const STEPS_WEB = [
  {
    title: 'Chrome বা Edge-এ MyVoucher খুলুন',
    body: 'ঠিকানা বারে সাইটটি পুরোপুরি লোড হতে দিন। প্রথমবার লোডের পর ফন্ট, আইকন ও অ্যাপ ফাইল ক্যাশ হবে।',
  },
  {
    title: 'ইনস্টল অপশন বেছে নিন',
    body: 'ঠিকানা বারের ডানদিকে ইনস্টল আইকনে ক্লিক করুন, অথবা ব্রাউজার মেনু থেকে “Install app” / “Add to Home screen” নির্বাচন করুন।',
  },
  {
    title: 'হোম স্ক্রিন থেকে খুলুন',
    body: 'ইনস্টল হওয়ার পর MyVoucher আলাদা অ্যাপের মতো খুলবে। ইন্টারনেট বন্ধ করেও খরচ, ভাউচার ও ব্যাকআপ ব্যবহার করা যাবে।',
  },
];

const STEPS_ANDROID = [
  {
    title: 'APK ফাইল ডাউনলোড করুন',
    body: 'Android ডিভাইসে MyVoucher APK ফাইলটি ডাউনলোড করুন। ফাইলটি সম্পূর্ণ অ্যাপ ও লোকাল ফন্ট বহন করে—কোনো Vercel URL লোড করে না।',
  },
  {
    title: 'অজানা উৎস থেকে ইনস্টল অনুমতি দিন',
    body: 'Settings → Apps → Special app access → Install unknown apps থেকে আপনার ফাইল ম্যানেজার বা ব্রাউজারকে অনুমতি দিন।',
  },
  {
    title: 'APK ইনস্টল ও খুলুন',
    body: 'ডাউনলোড করা APK-তে ট্যাপ করে Install চাপুন। ইনস্টল শেষে MyVoucher আইকন থেকে অ্যাপটি খুলুন।',
  },
  {
    title: 'অফলাইনে ব্যবহার করুন',
    body: 'প্রথমবার খোলার পর নাম দিন। এরপর খরচ, ভাউচার, PDF ও ব্যাকআপ সম্পূর্ণ ইন্টারনেট ছাড়াই কাজ করবে।',
  },
];

export function InstallPage() {
  const [tab, setTab] = useState<Tab>('web');
  const { canInstall, isInstalled, promptInstall } = useInstallPrompt();
  const toast = useToast();
  const native = isNativeApp();

  // The Android build ships without any installation instructions.
  if (native) return <Navigate to="/" replace />;

  const handleInstall = async () => {
    const result = await promptInstall();
    if (result === 'accepted') toast.success('MyVoucher ইনস্টল শুরু হয়েছে।');
    if (result === 'unavailable') {
      toast.toast('ব্রাউজার সরাসরি ইনস্টল প্রম্পট দিচ্ছে না। নিচের ধাপগুলো অনুসরণ করুন।', 'info');
    }
  };

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="অ্যাপ ইনস্টল"
        title="MyVoucher সঙ্গে রাখুন"
        description="ব্রাউজার অ্যাপ হিসেবে অথবা Android APK হিসেবে ইনস্টল করুন। দুটোই একই সোর্স থেকে তৈরি এবং সম্পূর্ণ অফলাইনে চলে।"
      />

      <section className="relative mb-5 overflow-hidden rounded-xl2 border border-primary/20 bg-primary px-5 py-7 text-white shadow-lift sm:px-7">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 29px, #fff 29px, #fff 30px)',
          }}
        />
        <div className="relative grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold tracking-wide">
              {isInstalled ? <BadgeCheck size={12} /> : <WifiOff size={12} />}
              {isInstalled ? 'ইতিমধ্যে ইনস্টল করা আছে' : 'সম্পূর্ণ অফলাইন ব্যবহার'}
            </span>
            <h2 className="mt-3 font-display text-2xl font-bold leading-snug sm:text-3xl">
              হিসাব খাতা হাতের মুঠোয়
            </h2>
            <p className="mt-2 max-w-xl text-[12.5px] leading-7 text-white/75">
              ইন্টারনেট ছাড়াই খরচ লিখুন, ভাউচার তৈরি করুন, PDF ডাউনলোড ও প্রিন্ট করুন। আপনার
              আর্থিক তথ্য আপনার ডিভাইসেই থাকে।
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
            <button
              type="button"
              className="btn bg-white text-[#0c3b30] hover:bg-[#f5efe2]"
              onClick={() => {
                if (canInstall) void handleInstall();
                else setTab('web');
              }}
            >
              {canInstall ? <Download size={16} /> : <Laptop size={16} />}
              {isInstalled ? 'অ্যাপ ইনস্টল করা আছে' : canInstall ? 'এখনই ইনস্টল করুন' : 'ইনস্টল নির্দেশনা'}
            </button>
            <span className="text-center text-[10px] text-white/55">v{APP_VERSION}</span>
          </div>
        </div>
      </section>

      <div className="mb-4 flex items-center gap-1 overflow-x-auto rounded-lg border border-line bg-surface p-1 sm:w-fit">
        {(
          [
            ['web', 'ব্রাউজার / PWA', Laptop],
            ['android', 'Android APK', Smartphone],
            ['safety', 'ডেটা ও নিরাপত্তা', ShieldCheck],
          ] as const
        ).map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`flex shrink-0 items-center gap-1.5 rounded-md px-3.5 py-2 text-[12px] font-semibold transition-colors ${
              tab === value ? 'bg-primary-soft text-primary' : 'text-muted hover:text-ink'
            }`}
            aria-pressed={tab === value}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === 'web' && (
        <section className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
          <div className="card p-5">
            <h2 className="font-display text-lg font-bold">ব্রাউজারে ইনস্টল করার ধাপ</h2>
            <p className="mt-1 text-[11.5px] text-muted">Android Chrome, Edge ও ডেস্কটপ Chromium ব্রাউজারে প্রযোজ্য।</p>
            <ol className="mt-5 space-y-4">
              {STEPS_WEB.map((step, index) => (
                <li key={step.title} className="flex gap-3.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-raised text-[11px] font-bold text-primary">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold text-ink">{step.title}</p>
                    <p className="mt-1 text-[11.5px] leading-6 text-muted">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-5 flex gap-2 rounded-lg border border-primary/15 bg-primary-soft/40 p-3.5 text-[11px] leading-6 text-muted">
              <Info size={15} className="mt-0.5 shrink-0 text-primary" />
              iPhone/iPad-এ Safari-র Share বোতাম → “Add to Home Screen” ব্যবহার করুন। iOS-এ PDF
              ডাউনলোডের পর Files অ্যাপে সংরক্ষণ করা যাবে।
            </div>
          </div>
          <div className="space-y-3">
            <div className="card p-4">
              <Smartphone size={19} className="text-primary" />
              <p className="mt-2 text-[12.5px] font-semibold">PWA কীভাবে কাজ করে?</p>
              <p className="mt-1 text-[11px] leading-6 text-muted">
                প্রথম সফল অনলাইন লোডে HTML, JS, CSS, বাংলা ফন্ট ও আইকন ক্যাশ হয়। এরপর অ্যাপ
                অফলাইনেও খোলে। IndexedDB-তে থাকা রেকর্ড আপডেটে মুছে যায় না।
              </p>
            </div>
            <div className="card p-4">
              <RefreshCw size={19} className="text-accent" />
              <p className="mt-2 text-[12.5px] font-semibold">নতুন সংস্করণ</p>
              <p className="mt-1 text-[11px] leading-6 text-muted">
                ইন্টারনেট থাকলে নতুন সংস্করণ স্বয়ংক্রিয়ভাবে ক্যাশ হয়। অ্যাপ বন্ধ করে আবার খুললে
                সর্বশেষ সংস্করণ পেতে পারেন।
              </p>
            </div>
          </div>
        </section>
      )}

      {tab === 'android' && (
        <section className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
          <div className="card p-5">
            <h2 className="font-display text-lg font-bold">Android APK ইনস্টল</h2>
            <p className="mt-1 text-[11.5px] text-muted">
              APK-তে সম্পূর্ণ ফ্রন্টএন্ড বান্ডল করা। এটি ওয়েবসাইট লোড করে না।
            </p>

            {native && (
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-primary/25 bg-primary-soft/50 p-4 text-[12.5px] leading-6 text-ink">
                <BadgeCheck size={18} className="mt-0.5 shrink-0 text-primary" />
                <span>আপনি MyVoucher APK সংস্করণ ব্যবহার করছেন। নতুন সংস্করণের জন্য আপডেট করা APK আবার ইনস্টল করুন।</span>
              </div>
            )}

            <a
              href="/downloads/MyVoucher-debug.apk"
              download
              className={`mt-4 flex items-center justify-between gap-4 rounded-xl border border-primary/25 bg-primary-soft/50 p-4 transition-colors hover:bg-primary-soft ${native ? 'hidden' : ''}`}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
                  <ArrowDownToLine size={18} />
                </span>
                <div>
                  <p className="text-[13px] font-semibold">MyVoucher-debug.apk</p>
                  <p className="text-[10.5px] text-muted">Android ৬.০+ · অফলাইন ইনস্টলেশন</p>
                </div>
              </div>
              <Download size={18} className="text-primary" />
            </a>

            <ol className="mt-5 space-y-4">
              {STEPS_ANDROID.map((step, index) => (
                <li key={step.title} className="flex gap-3.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-raised text-[11px] font-bold text-primary">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold text-ink">{step.title}</p>
                    <p className="mt-1 text-[11.5px] leading-6 text-muted">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="space-y-3">
            <div className="card p-4">
              <Tablet size={19} className="text-primary" />
              <p className="mt-2 text-[12.5px] font-semibold">ফোন ও ট্যাবলেট</p>
              <p className="mt-1 text-[11px] leading-6 text-muted">
                ইন্টারফেস ছোট স্ক্রিনে টাচ-বান্ধব। স্প্রেডশিট মোবাইলে পাঁচটি ঘরসহ কার্ড আকারে
                দেখা যায় এবং সরাসরি সম্পাদনা করা যায়।
              </p>
            </div>
            <div className="rounded-xl border border-accent/25 bg-accent-soft/55 p-4">
              <LockKeyhole size={19} className="text-accent" />
              <p className="mt-2 text-[12.5px] font-semibold">APK ওয়েবসাইটের ওপর নির্ভর করে না</p>
              <p className="mt-1 text-[11px] leading-6 text-muted">
                APK-তে বান্ডল করা লোকাল অ্যাসেট ও WebView ব্যবহার হয়। Vercel বন্ধ থাকলেও অ্যাপ
                খুলবে ও সব ডেটা সংরক্ষণ করবে।
              </p>
            </div>
          </div>
        </section>
      )}

      {tab === 'safety' && (
        <section className="grid gap-5 lg:grid-cols-2">
          <div className="card p-5">
            <h2 className="font-display text-lg font-bold">আপনার ডেটা কোথায়?</h2>
            <ul className="mt-4 space-y-3 text-[12px] leading-6 text-muted">
              <li className="flex gap-2.5"><CheckCircle2 size={15} className="mt-1 shrink-0 text-primary" /> সব খরচ, খাত, প্রোফাইল ও সেটিংস এই ডিভাইসের IndexedDB-তে সংরক্ষিত।</li>
              <li className="flex gap-2.5"><CheckCircle2 size={15} className="mt-1 shrink-0 text-primary" /> কোনো ব্যাকএন্ড, MongoDB বা ক্লাউড ডেটাবেজ প্রয়োজন নেই।</li>
              <li className="flex gap-2.5"><CheckCircle2 size={15} className="mt-1 shrink-0 text-primary" /> কোনো আর্থিক তথ্য বাইরে পাঠানো হয় না; তৃতীয় পক্ষের ট্র্যাকিং নেই।</li>
              <li className="flex gap-2.5"><CheckCircle2 size={15} className="mt-1 shrink-0 text-primary" /> Google Drive সংযোগ ঐচ্ছিক ভবিষ্যৎ মডিউল; বর্তমানে সক্রিয় নয়।</li>
            </ul>
          </div>
          <div className="card border-accent/25 p-5">
            <Info size={19} className="text-accent" />
            <h2 className="mt-2 font-display text-lg font-bold">গুরুত্বপূর্ণ সীমাবদ্ধতা</h2>
            <p className="mt-2 text-[12px] leading-7 text-muted">
              অ্যাপ আনইনস্টল করলে, ফোনের অ্যাপ ডেটা ক্লিয়ার করলে, ব্রাউজারের “Clear site data”
              করলে অথবা ডিভাইস বদলালে স্থানীয় রেকর্ড হারিয়ে যেতে পারে। তাই নিয়মিত{' '}
              <a href="/backup" className="font-semibold text-primary hover:underline">
                JSON ব্যাকআপ
              </a>{' '}
              ডাউনলোড করে নিরাপদ জায়গায় রাখুন। ব্যাকআপ ফাইল থেকেই সব তথ্য পুনরুদ্ধার করা যাবে।
            </p>
          </div>
        </section>
      )}

      <p className="mt-5 text-center text-[10.5px] text-muted">
        MyVoucher v{APP_VERSION} · ব্যক্তিগত ব্যবহারের জন্য তৈরি একটি অফলাইন হিসাব খাতা
      </p>
    </div>
  );
}
