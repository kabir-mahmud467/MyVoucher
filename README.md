# MyVoucher — বাংলা খরচ ও ভাউচার অ্যাপ

[English documentation below](#english)

**MyVoucher** হলো সম্পূর্ণ অফলাইন, বাংলা ভাষার একটি ব্যক্তিগত ও প্রাতিষ্ঠানিক খরচ ব্যবস্থাপনা অ্যাপ। এটি ওয়েবে PWA হিসেবে চলে এবং Android-এ native APK হিসেবে ইনস্টল করা যায়। অ্যাপের মূল বৈশিষ্ট্য হলো যেকোনো তৈরি করা খরচ থেকে তাৎক্ষণিকভাবে স্ট্যান্ডার্ড প্রিন্ট-রেডি ভাউচার (A5 / A4) তৈরি করা, যার জন্য আলাদা কোনো ডেটা ইনপুট দিতে হয় না।

---

## বৈশিষ্ট্যসমুহ

- **বাংলা-প্রথম ও পুরোপুরি অফলাইন:** কোনো ব্যাকএন্ড সার্ভার বা ইন্টারনেট সংযোগ দরকার হয় না। সব ডেটা ক্লায়েন্টের IndexedDB-তে নিরাপদে সংরক্ষিত থাকে।
- **স্বয়ংক্রিয় A5 ভাউচার (সাধারণ খরচ):** প্রতিটি সাধারণ খরচের জন্য A5 ফরম্যাটের স্ট্যান্ডার্ড ভাউচার তৈরি হয়।
- **A4 ল্যান্ডস্কেপ বাল্ক প্রিন্টিং:** ভাউচার তালিকা থেকে **"সব ভাউচার PDF"** চাপলে দুটি ভিন্ন A5 ভাউচার একটি A4 ল্যান্ডস্কেপ পাতায় পাশাপাশি সুন্দরভাবে সাজিয়ে PDF তৈরি করা যায়।
- **সম্মিলিত A4 যাতায়াত ভাউচার (যাতায়াত খরচ):** যাতায়াত খাতের একাধিক তারিখের সব ভ্রমণ রেকর্ড একটি A4 পোর্ট্রেট শিটের সারণিতে (Table) নতুন নতুন সারি (Row) হিসেবে একত্রে আসে।
- **ম্যানুয়াল তারিখ ও মাস/বছর নির্বাচন:** যেকোনো তারিখ লেখার সময় মাস ও বছর সহজে ড্রপডাউন থেকে এবং দিনটি ম্যানুয়ালি টাইপ করে দ্রুত ইনপুট দেওয়া যায়।
- **ব্যাকআপ ও রিস্টোর:** ডেটাবেজের সম্পূর্ণ JSON ব্যাকআপ ডাউনলোড এবং তা থেকে `Merge` বা `Replace` মোডে রিস্টোর করা যায়। এছাড়া Excel-এর জন্য UTF-8 BOM সমৃদ্ধ CSV এক্সপোর্ট সুবিধা রয়েছে।
- **Android APK ও PWA:** Capacitor 6 ব্যবহার করে তৈরি নিখুঁত Android build, যা Android 8.0 (API 22) থেকে শুরু করে সব আধুনিক ডিভাইসে চলে।

---

## টেকনোলজি স্ট্যাক

- **Frontend Framework:** React 18 + TypeScript + Vite
- **UI & Styling:** Tailwind CSS + Lucide Icons + Noto Sans / Noto Serif Bengali fonts
- **Database:** Dexie.js (IndexedDB wrapper v4)
- **PDF Generation:** jsPDF + html2canvas
- **Native Wrapper:** Capacitor 6 (`@capacitor/core`, `@capacitor/filesystem`, `@capacitor/share`, `@capacitor/app`)
- **PWA:** `vite-plugin-pwa` (Workbox)
- **Automated Testing:** Playwright Core (Smoke tests)

---

## প্রোজেক্ট শুরু করার নিয়ম

### ১. ইনস্টলেশন
```bash
npm install
```

### ২. ডেভেলপমেন্ট সার্ভার চালু
```bash
npm run dev
```

### ৩. টাইপচেক ও প্রোডাকশন বিল্ড
```bash
npm run typecheck
npm run build
```

### ৪. লোকাল প্রিভিউ
```bash
npm run preview
```

### ৫. Android APK বিল্ড (Linux / macOS)
```bash
npm run build
npx cap sync android
cd android
JAVA_HOME=$HOME/jdk/jdk-17.0.21+9 ANDROID_HOME=$HOME/Android/sdk ./gradlew assembleDebug --no-daemon -x lint
```

---

<a name="english"></a>
## English Documentation

### Architecture Overview

MyVoucher is built as a single-page application targeting both modern web browsers (PWA) and Android native runtimes via Capacitor.

```
src/
├── App.tsx                      # Main React router configuration
├── main.tsx                     # PWA registration, DB init & app bootstrapper
├── components/
│   ├── expenses/                # Expense form, table rows & TravelLedger tab
│   ├── layout/                  # Responsive AppShell, sidebar & mobile bottom bar
│   ├── ui/                      # Modal, ManualDateInput, PageHeader, ConfirmDialog
│   └── vouchers/                # VoucherDocument (A5) & TravelVoucherDocument (A4)
├── db/
│   ├── database.ts              # Dexie DB schema (versions 1, 2, 3 with auto upgrades)
│   ├── backupService.ts         # Backup validation, JSON create/restore & CSV export
│   └── types.ts                 # TypeScript interfaces for Expense, Category, etc.
├── lib/
│   ├── dates.ts                 # Bengali date utilities, month keys & clamping
│   ├── format.ts                # Bengali/English digit conversion & currency formatting
│   ├── pdf.ts                   # html2canvas canvas scale retries & jsPDF rendering
│   └── travel.ts                # Travel details composition & field validation
└── pages/
    ├── ExpensesPage.tsx         # Expense table with "সব খরচ" and "যাতায়াত" tabs
    ├── VouchersPage.tsx         # Voucher list and batch A4 PDF generator
    ├── VoucherPage.tsx          # Single voucher preview, PDF & print actions
    ├── SettingsPage.tsx         # Profile, theme, install info & embedded Backup
    └── InstallPage.tsx          # Web-only PWA/APK installation guide
```

### Database Schema (Dexie v3)

1. **`users`**: `{ id, name, createdAt, updatedAt }`
2. **`expenses`**: `{ id, date, categoryId, description, quantity, calculationMode, unitPrice, totalAmount, travelDetails, createdAt, updatedAt }`
3. **`categories`**: `{ id, name, kind ('general' | 'travel'), archived, createdAt, updatedAt }`
4. **`settings`**: `{ id, key, value }`
5. **`metadata`**: `{ id, key, value }`

---

## License

Private Project. Built for Bengali expense & voucher management.
