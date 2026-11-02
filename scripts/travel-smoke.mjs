import { chromium } from 'playwright-core';
import fs from 'node:fs';

const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox'],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  locale: 'bn-BD',
  acceptDownloads: true,
});
const page = await context.newPage();
const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
});
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));

const base = 'http://127.0.0.1:4173';
await page.goto(base + '/', { waitUntil: 'networkidle' });
console.log('title:', await page.title());
await page.screenshot({ path: '/tmp/mv2-onboarding.png', fullPage: true });

await page.getByLabel('আপনার নাম').fill('কবির মাহমুদ');
await page.getByRole('button', { name: 'শুরু করুন' }).click();
await page.locator('h1').first().waitFor({ timeout: 15000 });
await page.waitForTimeout(500);

// Travel expense
await page.getByRole('button', { name: 'নতুন খরচ' }).first().click();
await page.locator('#expense-category').selectOption({ label: 'যাতায়াত' });
await page.getByLabel('কোথা থেকে').fill('ঢাকা');
await page.getByLabel('কোথায়').fill('গাজীপুর');
await page.getByLabel('মাধ্যম').selectOption({ label: 'বাস' });
await page.getByLabel('কতজন').fill('2');
await page.getByLabel('উদ্দেশ্য').fill('অফিসের কাজে সভায় যাওয়া');
await page.locator('#expense-total').fill('150');
await page.screenshot({ path: '/tmp/mv2-travel-modal.png', fullPage: true });
console.log('generic description visible:', await page.locator('#expense-description').count());
await page.getByRole('button', { name: 'খরচ যোগ করুন', exact: true }).click();
await page.getByText('নতুন খরচ যোগ হয়েছে।').waitFor();

// Generic automatic expense
await page.getByRole('button', { name: 'নতুন খরচ' }).first().click();
await page.locator('#expense-category').selectOption({ label: 'আপ্যায়ন' });
await page.locator('#expense-description').fill('অতিথি আপ্যায়ন');
await page.getByRole('button', { name: 'স্বয়ংক্রিয়' }).click();
await page.locator('#expense-quantity').fill('2');
await page.locator('#expense-unit-price').fill('250');
await page.getByRole('button', { name: 'খরচ যোগ করুন', exact: true }).click();
await page.getByText('নতুন খরচ যোগ হয়েছে।').waitFor();

await page.getByRole('link', { name: 'খরচের হিসাব' }).first().click();
await page.getByRole('heading', { name: 'খরচের খাতা' }).waitFor();
const headers = await page.locator('thead th').allInnerTexts();
console.log('headers:', headers);
const travelRow = page.locator('tbody tr').filter({ hasText: 'ঢাকা' });
console.log('travel rows:', await travelRow.count());
console.log('travel summary:', await travelRow.first().innerText());
const bengaliDate = await travelRow.first().locator('.date-field-label').innerText();
console.log('date display:', bengaliDate);
await page.screenshot({ path: '/tmp/mv2-expenses.png', fullPage: true });

// Inline passenger correction
const passengerInput = travelRow.first().getByLabel('কতজন যাত্রী');
await passengerInput.fill('3');
await passengerInput.blur();
await page.waitForTimeout(1000);
console.log('save status:', await travelRow.first().getByText(/সংরক্ষিত|সংরক্ষণ হচ্ছে/).count());

// Voucher
await travelRow.first().getByRole('link', { name: /ভাউচার দেখুন/ }).click();
await page.getByRole('heading', { name: 'A5 ভাউচার' }).waitFor();
const voucherText = await page.locator('.voucher-paper').first().innerText();
console.log('voucher text:\n' + voucherText);
console.log('voucher checks', {
  from: voucherText.includes('কোথা থেকে: ঢাকা'),
  to: voucherText.includes('কোথায়: গাজীপুর'),
  passengers: voucherText.includes('কতজন: ৩ জন'),
  mode: voucherText.includes('মাধ্যম: বাস'),
  purpose: voucherText.includes('উদ্দেশ্য: অফিসের কাজে সভায় যাওয়া'),
  total: voucherText.includes('১৫০'),
  noUnitPrice: !voucherText.includes('একক মূল্য'),
});
await page.screenshot({ path: '/tmp/mv2-voucher-travel.png', fullPage: true });

// PDF
const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
await page.getByRole('button', { name: 'PDF ডাউনলোড' }).click();
const download = await downloadPromise;
const pdfPath = '/tmp/mv2-travel.pdf';
await download.saveAs(pdfPath);
console.log('pdf size:', fs.statSync(pdfPath).size);

// Browser print PDF
await page.emulateMedia({ media: 'print' });
await page.pdf({ path: '/tmp/mv2-print.pdf', format: 'A5', printBackground: true, preferCSSPageSize: true });
await page.emulateMedia({ media: 'screen' });
console.log('print pdf size:', fs.statSync('/tmp/mv2-print.pdf').size);

// Backup + CSV exports
await page.getByRole('link', { name: 'ব্যাকআপ ও রিস্টোর' }).first().click();
await page.getByRole('heading', { name: 'আপনার তথ্য সুরক্ষিত রাখুন' }).waitFor();
const backupDownload = page.waitForEvent('download', { timeout: 60000 });
await page.getByRole('button', { name: 'JSON ব্যাকআপ ডাউনলোড' }).click();
const backup = await backupDownload;
const backupPath = '/tmp/mv2-backup.json';
await backup.saveAs(backupPath);
const backupObj = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
console.log('backup:', {
  expenses: backupObj.data.expenses.length,
  travel: Boolean(backupObj.data.expenses.find((e) => e.travelDetails)?.travelDetails),
  travelCategoryKind: backupObj.data.categories.find((c) => c.name === 'যাতায়াত')?.kind,
});
const csvDownload = page.waitForEvent('download', { timeout: 60000 });
await page.getByRole('button', { name: 'CSV ডাউনলোড' }).click();
const csv = await csvDownload;
const csvPath = '/tmp/mv2-expenses.csv';
await csv.saveAs(csvPath);
const csvBytes = fs.readFileSync(csvPath);
console.log('csv BOM:', csvBytes[0].toString(16), csvBytes[1].toString(16), csvBytes[2].toString(16));

// Mobile check
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(base + '/expenses', { waitUntil: 'networkidle' });
await page.locator('.expense-table').waitFor({ timeout: 15000 });
await page.waitForTimeout(600);
await page.screenshot({ path: '/tmp/mv2-mobile-expenses.png', fullPage: true });
const tableBox = await page.locator('.expense-table').boundingBox();
console.log('mobile table width:', tableBox?.width, 'viewport: 390');
await page.goto(base + '/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.screenshot({ path: '/tmp/mv2-mobile-dashboard.png', fullPage: true });

// Offline PWA
await page.setViewportSize({ width: 1440, height: 1000 });
await page.goto(base + '/', { waitUntil: 'networkidle' });
await page.evaluate(async () => {
  if (!('serviceWorker' in navigator)) throw new Error('no sw');
  await navigator.serviceWorker.ready;
});
await context.setOffline(true);
await page.goto(base + '/expenses', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);
console.log('offline heading:', (await page.locator('h1').first().innerText()).trim());
await page.screenshot({ path: '/tmp/mv2-offline.png', fullPage: true });
await context.setOffline(false);

console.log('errors:', errors);
await browser.close();
