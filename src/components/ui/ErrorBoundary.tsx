import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { LogoMark } from './Logo';

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('MyVoucher UI error:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas p-5">
        <div className="card w-full max-w-lg p-7 text-center">
          <LogoMark size={48} className="mx-auto rounded-[26%]" />
          <div className="mx-auto mt-5 flex h-11 w-11 items-center justify-center rounded-full bg-danger-soft text-danger">
            <AlertTriangle size={20} />
          </div>
          <h1 className="mt-4 font-display text-xl font-bold">কিছু একটা সমস্যা হয়েছে</h1>
          <p className="mt-2 text-sm leading-7 text-muted">
            অ্যাপটি একটি অপ্রত্যাশিত সমস্যায় পড়েছে। আপনার সংরক্ষিত তথ্য এই ডিভাইসেই নিরাপদে আছে।
            পৃষ্ঠাটি আবার লোড করে চেষ্টা করুন।
          </p>
          <button
            type="button"
            className="btn btn-primary mx-auto mt-6"
            onClick={() => window.location.reload()}
          >
            <RefreshCw size={16} />
            আবার লোড করুন
          </button>
        </div>
      </main>
    );
  }
}
