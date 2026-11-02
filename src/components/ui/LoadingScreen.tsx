import { LogoMark } from './Logo';

export function LoadingScreen({ label = 'আপনার হিসাব খাতা প্রস্তুত হচ্ছে…' }: { label?: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas px-5">
      <LogoMark size={56} className="rounded-[26%] shadow-card" />
      <div className="text-center">
        <p className="font-display text-lg font-bold">MyVoucher</p>
        <p className="mt-1.5 text-sm text-muted">{label}</p>
      </div>
      <div className="mt-1 h-1 w-36 overflow-hidden rounded-full bg-raised" aria-hidden="true">
        <div className="h-full w-1/2 animate-[fade-in_1.2s_ease-in-out_infinite_alternate] rounded-full bg-primary" />
      </div>
    </main>
  );
}
