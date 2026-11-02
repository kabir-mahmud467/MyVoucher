import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';
import { createUser } from '../db/userService';
import { validateUserName } from '../lib/validation';
import { LogoMark } from '../components/ui/Logo';

export function OnboardingPage() {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const validationError = validateUserName(name);
    if (validationError) {
      setError(validationError);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await createUser(name);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'প্রোফাইল তৈরি করা যায়নি।');
      setBusy(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-canvas">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            'radial-gradient(circle at 12% 18%, rgb(var(--primary) / .09), transparent 30%), radial-gradient(circle at 88% 82%, rgb(var(--accent) / .09), transparent 28%)',
        }}
      />
      <div className="relative mx-auto grid min-h-screen max-w-6xl lg:grid-cols-[1.05fr_.95fr]">
        <section className="flex flex-col justify-between px-6 py-7 sm:px-10 lg:px-12 lg:py-10">
          <div className="flex items-center gap-3">
            <LogoMark size={42} className="rounded-[26%] shadow-sm" />
            <div>
              <p className="font-display text-xl font-bold leading-none tracking-tight">MyVoucher</p>
              <p className="mt-1.5 text-[10.5px] tracking-[0.08em] text-muted">
                খরচ ও ভাউচার ব্যবস্থাপনা
              </p>
            </div>
          </div>

          <div className="my-12 max-w-xl animate-fade-up lg:my-0">
            <span className="chip border-primary/20 bg-primary-soft text-primary">
              <Sparkles size={13} />
              সম্পূর্ণ অফলাইন · বাংলা ভাষায়
            </span>
            <h1 className="mt-5 font-display text-[34px] font-bold leading-[1.28] tracking-tight text-ink sm:text-[44px]">
              স্বাগতম <span className="text-primary">MyVoucher</span>-এ
            </h1>
            <p className="mt-4 max-w-md text-[15px] leading-8 text-muted">
              খরচের হিসাব রাখুন সহজে। প্রতিটি খরচ থেকে তৈরি করুন প্রিন্টযোগ্য ভাউচার — সবকিছু
              আপনার নিজের ডিভাইসেই।
            </p>

            <div className="mt-8 grid max-w-md gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-line bg-surface/80 p-4">
                <LockKeyhole size={18} className="text-primary" />
                <p className="mt-2.5 text-[13px] font-semibold text-ink">তথ্য শুধু আপনার কাছে</p>
                <p className="mt-1 text-[11.5px] leading-6 text-muted">
                  কোনো সার্ভার বা ক্লাউডে খরচ পাঠানো হয় না।
                </p>
              </div>
              <div className="rounded-xl border border-line bg-surface/80 p-4">
                <ShieldCheck size={18} className="text-accent" />
                <p className="mt-2.5 text-[13px] font-semibold text-ink">ইন্টারনেট ছাড়াই</p>
                <p className="mt-1 text-[11.5px] leading-6 text-muted">
                  অফলাইনেও হিসাব, ভাউচার ও ব্যাকআপ কাজ করে।
                </p>
              </div>
            </div>
          </div>

          <p className="hidden text-[11px] text-muted lg:block">
            MyVoucher · ব্যক্তিগত ব্যবহারের জন্য একটি অফলাইন হিসাব খাতা
          </p>
        </section>

        <section className="flex items-center px-4 pb-8 sm:px-8 lg:px-10 lg:py-10">
          <div className="card relative w-full overflow-hidden p-6 shadow-lift sm:p-8">
            <div className="absolute right-0 top-0 h-28 w-28 rounded-bl-full bg-primary-soft/75" />
            <div className="relative">
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-raised font-display text-lg font-bold text-primary">
                ১
              </span>
              <h2 className="mt-5 font-display text-2xl font-bold tracking-tight text-ink">
                আপনার নাম লিখুন
              </h2>
              <p className="mt-2 text-sm leading-7 text-muted">
                এই নামটি শুধু ভাউচারের{' '}
                <span className="font-semibold text-ink">প্রস্তুতকারীর স্বাক্ষর</span> অংশে দেখা
                যাবে।
              </p>

              <form onSubmit={handleSubmit} noValidate className="mt-6">
                <label htmlFor="onboarding-name" className="field-label">
                  আপনার নাম
                </label>
                <input
                  id="onboarding-name"
                  type="text"
                  autoComplete="name"
                  autoFocus
                  maxLength={80}
                  className="field h-12 text-base"
                  placeholder="যেমন: কবির মাহমুদ"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setError('');
                  }}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'name-error' : 'name-hint'}
                />
                {error ? (
                  <p id="name-error" className="field-error" role="alert">
                    {error}
                  </p>
                ) : (
                  <p id="name-hint" className="field-hint">
                    পরে সেটিংস থেকে এই নাম পরিবর্তন করা যাবে।
                  </p>
                )}

                <button type="submit" className="btn btn-primary mt-6 w-full" disabled={busy}>
                  {busy ? 'প্রস্তুত হচ্ছে…' : 'শুরু করুন'}
                  {!busy && <ArrowRight size={17} />}
                </button>
              </form>

              <div className="mt-6 border-t border-line pt-5">
                <p className="text-[11.5px] leading-6 text-muted">
                  কোনো নিবন্ধন, পাসওয়ার্ড বা ইন্টারনেট প্রয়োজন নেই। এই ডিভাইসে একজন ব্যবহারকারীর
                  জন্যই MyVoucher তৈরি।
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <a
        href="#onboarding-name"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2"
      >
        নামের ঘরে যান
        <ArrowLeft size={14} className="ml-1 inline" />
      </a>
    </main>
  );
}
