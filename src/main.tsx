import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';
import { initializeDatabase } from './db/database';
import { setupNativeBackButton } from './lib/native';

async function bootstrap() {
  try {
    await initializeDatabase();
  } catch (error) {
    console.error('Database initialization failed', error);
    document.getElementById('root')!.innerHTML = `
      <main style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#f5f2ea;font-family:'Noto Sans Bengali',sans-serif;color:#16251f">
        <div style="max-width:480px;border:1px solid #dcd6c9;background:#fffdf8;border-radius:16px;padding:28px;text-align:center">
          <div style="font-size:36px">⚠️</div>
          <h1 style="font-size:20px;margin:12px 0 8px">ডেটাবেজ খোলা যায়নি</h1>
          <p style="font-size:14px;line-height:1.8;color:#697069">আপনার ব্রাউজার বা অ্যাপের স্টোরেজে সমস্যা হয়েছে। স্টোরেজ অনুমতি পরীক্ষা করে পৃষ্ঠাটি আবার লোড করুন। আপনার আগের রেকর্ড মুছে ফেলবেন না।</p>
          <button style="margin-top:16px;border:0;border-radius:8px;background:#0f5a48;color:#fff;padding:10px 18px;font-family:inherit;font-weight:600;cursor:pointer" onclick="location.reload()">আবার লোড করুন</button>
        </div>
      </main>`;
    return;
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );

  void setupNativeBackButton();

  registerSW({
    immediate: true,
    onOfflineReady() {
      console.info('MyVoucher is ready for offline use.');
    },
    onRegisterError(error) {
      console.warn('Service worker registration failed:', error);
    },
  });
}

void bootstrap();
