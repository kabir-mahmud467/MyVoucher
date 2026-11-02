import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="card mx-auto mt-10 max-w-lg px-6 py-14 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-raised text-muted">
        <Compass size={24} />
      </div>
      <p className="mt-4 font-display text-3xl font-bold">৪০৪</p>
      <h1 className="mt-1 font-display text-xl font-bold">পৃষ্ঠাটি পাওয়া যায়নি</h1>
      <p className="mt-2 text-sm leading-7 text-muted">
        আপনি যে পৃষ্ঠাটি খুঁজছেন সেটি সরানো হয়েছে অথবা ঠিকানাটি ভুল।
      </p>
      <Link to="/" className="btn btn-primary mt-6">
        ড্যাশবোর্ডে ফিরে যান
      </Link>
    </div>
  );
}
