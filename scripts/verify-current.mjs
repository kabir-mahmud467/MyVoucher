import { chromium } from 'playwright-core';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

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

const base = 'http://localhost:4175';
const log = (...args) => console.log(...args);

await page.goto(base + '/', { waitUntil: 'networkidle' });
await page.getByLabel('আপনার নাম').fill('কবির মাহমুদ');
await page.getByRole('button', { name: 'শুরু করুন' }).click();
await page.locator('h1').first().waitFor({ timeout: 15000 });
await page.waitForTimeout(500);

async function addTravel({ from, to, passengers, mode, purpose, total, day }) {
  await page.getByRole('button', { name: 'নতুন খরচ' }).first().click();
  await page.locator('#expense-category').selectOption({ label: 'যাতায়াত' });
  await page.getByLabel('খরচের তারিখ — দিন').fill(String(day));
  await page.getByLabel('খরচের তারিখ — মাস').selectOption({ label: 'মার্চ' });
  await page.getByLabel('খরচের তারিখ — বছর').selectOption({ value: '2026' });
  await page.getByLabel('কোথা থেকে').fill(from);
  await page.getByLabel('কোথায়').fill(to);
  await page.getByLabel('মাধ্যম').selectOption({ label: mode });
  await page.getByLabel('কতজন').fill(String(passengers));
  await page.getByLabel('উদ্দেশ্য').fill(purpose);
  await page.locator('#expense-total').fill(String(total));
  await page.getByRole('button', { name: 'খরচ যোগ করুন', exact: true }).click();
  await page.getByText('নতুন খরচ যোগ হয়েছে।').first().waitFor();
}

await addTravel({
  from: 'ঢাকা',
  to: 'গাজীপুর',
  passengers: 2,
  mode: 'বাস',
  purpose: 'অফিসের কাজে সভায় যাওয়া',
  total: 150,
  day: 15,
});
await addTravel({
  from: 'ঢাকা',
  to: 'নারায়ণগঞ্জ',
  passengers: 3,
  mode: 'সিএনজি',
  purpose: 'মাঠ পরিদর্শন',
  total: 180,
  day: 15,
});
await addTravel({
  from: 'সিলেট',
  to: 'ঢাকা',
  passengers: 1,
  mode: 'ট্রেন',
  purpose: 'প্রশিক্ষণে অংশ নেওয়া',
  total: 900,
  day: 20,
});

// Generic expense for the normal voucher flow
await page.getByRole('button', { name: 'নতুন খরচ' }).first().click();
await page.locator('#expense-category').selectOption({ label: 'আপ্যায়ন' });
await page.getByLabel('খরচের তারিখ — দিন').fill('18');
await page.getByLabel('খরচের তারিখ — মাস').selectOption({ label: 'মার্চ' });
await page.getByLabel('খরচের তারিখ — বছর').selectOption({ value: '2026' });
await page.locator('#expense-description').fill('অতিথি আপ্যায়ন');
await page.getByRole('button', { name: 'স্বয়ংক্রিয়' }).click();
await page.locator('#expense-quantity').fill('2');
await page.locator('#expense-unit-price').fill('250');
await page.getByRole('button', { name: 'খরচ যোগ করুন', exact: true }).click();
await page.getByText('নতুন খরচ যোগ হয়েছে।').first().waitFor();

// Second normal voucher so the batch PDF has two different vouchers.
await page.getByRole('button', { name: 'নতুন খরচ' }).first().click();
await page.locator('#expense-category').selectOption({ label: 'আপ্যায়ন' });
await page.getByLabel('খরচের তারিখ — দিন').fill('19');
await page.getByLabel('খরচের তারিখ — মাস').selectOption({ label: 'মার্চ' });
await page.getByLabel('খরচের তারিখ — বছর').selectOption({ value: '2026' });
await page.locator('#expense-description').fill('স্টেশনারি ও প্রিন্টিং');
await page.getByRole('button', { name: 'স্বয়ংক্রিয়' }).click();
await page.locator('#expense-quantity').fill('1');
await page.locator('#expense-unit-price').fill('600');
await page.getByRole('button', { name: 'খরচ যোগ করুন', exact: true }).click();
await page.getByText('নতুন খরচ যোগ হয়েছে।').first().waitFor();

// The submit row must stay visible on a small Android-sized viewport.
await page.setViewportSize({ width: 390, height: 740 });
await page.getByRole('button', { name: 'নতুন খরচ' }).first().click();
const submitBox = await page.getByRole('button', { name: 'খরচ যোগ করুন', exact: true }).boundingBox();
log('submit footer visible:', Boolean(submitBox && submitBox.y >= 0 && submitBox.y + submitBox.height <= 740));
await page.getByRole('button', { name: 'বাতিল' }).click();
await page.setViewportSize({ width: 1440, height: 1000 });

// Install page still exists on the web build.
log('install nav count:', await page.getByRole('link', { name: /অ্যাপ ইনস্টল/ }).count());
log('separate travel nav count:', await page.getByRole('link', { name: 'যাতায়াত লগ' }).count());
log('separate backup nav count:', await page.getByRole('link', { name: 'ব্যাকআপ ও রিস্টোর' }).count());

// Travel ledger lives inside the expenses page as a tab.
await page.getByRole('link', { name: 'খরচের হিসাব' }).first().click();
await page.getByRole('button', { name: 'যাতায়াত', exact: true }).click();
await page.locator('section.card').first().waitFor();
const groupCount = await page.locator('section.card').count();
log('travel date groups:', groupCount);
const firstGroup = page.locator('section.card').first();
log('first group text:', (await firstGroup.innerText()).replace(/\n+/g, ' | '));
log('table headers:', await firstGroup.locator('thead th').allInnerTexts());
log('row count in first group:', await firstGroup.locator('tbody tr').count());

// One voucher combines every travel row from every date.
const targetGroup = page.locator('section.card').filter({ hasText: '১৫ মার্চ ২০২৬' });
await targetGroup.getByRole('link', { name: 'ভাউচার', exact: true }).click();
await page.getByRole('heading', { name: 'A4 যাতায়াত ভাউচার' }).waitFor();
await page.locator('.travel-voucher-paper').first().waitFor();
const travelVoucherText = await page.locator('.travel-voucher-paper').first().innerText();
log('combined voucher checks:', {
  heading: travelVoucherText.includes('যাতায়াত ভাউচার'),
  from: travelVoucherText.includes('ঢাকা'),
  toA: travelVoucherText.includes('গাজীপুর'),
  toB: travelVoucherText.includes('নারায়ণগঞ্জ'),
  purposeA: travelVoucherText.includes('অফিসের কাজে সভায় যাওয়া'),
  purposeB: travelVoucherText.includes('মাঠ পরিদর্শন'),
  purposeOtherDate: travelVoucherText.includes('প্রশিক্ষণে অংশ নেওয়া'),
  noBranding: !travelVoucherText.includes('MyVoucher'),
  hasKhat: travelVoucherText.includes('খাত:') && travelVoucherText.includes('যাতায়াত'),
  total: travelVoucherText.includes('১,২৩০'),
  totalLabel: travelVoucherText.includes('মোট টাকা'),
  signatureLabel: travelVoucherText.includes('প্রস্তুতকারীর স্বাক্ষর'),
  signatureName: travelVoucherText.includes('কবির মাহমুদ'),
  rows: await page.locator('.travel-voucher-paper tbody tr').count(),
});
await page.screenshot({ path: '/tmp/mv2-travel-a4.png', fullPage: true });

// Travel PDF should be A4 portrait
const travelDownloadPromise = page.waitForEvent('download', { timeout: 60000 });
await page.getByRole('button', { name: 'PDF ডাউনলোড' }).click({ noWaitAfter: true });
const travelDownload = await travelDownloadPromise;
await travelDownload.saveAs('/tmp/mv2-travel-a4.pdf');
log('travel pdf filename:', travelDownload.suggestedFilename());
log('travel pdf size:', fs.statSync('/tmp/mv2-travel-a4.pdf').size);
log('travel pdf info:', execFileSync('pdfinfo', ['/tmp/mv2-travel-a4.pdf']).toString().split('\n').filter((line) => /Pages|Page size/.test(line)).join(' | '));

// Print layout injection
await page.evaluate(() => {
  window.__printed = false;
  window.print = () => { window.__printed = true; };
});
await page.getByRole('button', { name: 'প্রিন্ট' }).click();
await page.waitForFunction(() => window.__printed);
log('travel print layout:', await page.evaluate(() => document.body.dataset.printLayout));
log('travel print portal:', await page.locator('.print-sheet-portrait .travel-voucher-paper').count());
await page.pdf({ path: '/tmp/mv2-travel-print.pdf', printBackground: true, preferCSSPageSize: true });
log('travel print pdf info:', execFileSync('pdfinfo', ['/tmp/mv2-travel-print.pdf']).toString().split('\n').filter((line) => /Pages|Page size/.test(line)).join(' | '));

// Normal voucher: one A5 voucher on an A4 landscape sheet (no duplicate).
await page.goto(base + '/vouchers', { waitUntil: 'networkidle' });
await page.locator('tbody tr').first().waitFor();
await page.getByRole('button', { name: 'সব ভাউচার PDF' }).waitFor({ state: 'visible' });
await page.waitForFunction(() => {
  const button = [...document.querySelectorAll('button')].find((item) =>
    item.textContent?.includes('সব ভাউচার PDF'),
  );
  return button && !button.disabled;
});
log('batch hidden vouchers:', await page.locator('.pdf-render-wrap .voucher-paper').count());

// Batch PDF: two different normal vouchers share one A4 landscape page.
const batchDownloadPromise = page.waitForEvent('download', { timeout: 120000 });
await page.getByRole('button', { name: 'সব ভাউচার PDF' }).click({ noWaitAfter: true });
const batchDownload = await batchDownloadPromise;
await batchDownload.saveAs('/tmp/mv2-batch-a4.pdf');
log('batch pdf filename:', batchDownload.suggestedFilename());
log('batch pdf size:', fs.statSync('/tmp/mv2-batch-a4.pdf').size);
log('batch pdf info:', execFileSync('pdfinfo', ['/tmp/mv2-batch-a4.pdf']).toString().split('\n').filter((line) => /Pages|Page size/.test(line)).join(' | '));

const genericRow = page.locator('tbody tr').filter({ hasText: 'অতিথি আপ্যায়ন' });
await genericRow.first().getByRole('link', { name: 'ভাউচার দেখুন' }).click();
await page.getByRole('heading', { name: 'A5 ভাউচার' }).waitFor();
log('print portal copies:', await page.locator('.print-sheet-landscape .voucher-paper').count());
const normalDownloadPromise = page.waitForEvent('download', { timeout: 60000 });
await page.getByRole('button', { name: 'PDF ডাউনলোড' }).click({ noWaitAfter: true });
const normalDownload = await normalDownloadPromise;
await normalDownload.saveAs('/tmp/mv2-normal-a4.pdf');
log('normal pdf filename:', normalDownload.suggestedFilename());
log('normal pdf size:', fs.statSync('/tmp/mv2-normal-a4.pdf').size);
log('normal pdf info:', execFileSync('pdfinfo', ['/tmp/mv2-normal-a4.pdf']).toString().split('\n').filter((line) => /Pages|Page size/.test(line)).join(' | '));
await page.evaluate(() => {
  window.__printed = false;
  window.print = () => { window.__printed = true; };
});
await page.getByRole('button', { name: 'প্রিন্ট' }).click();
await page.waitForFunction(() => window.__printed);
log('normal print layout:', await page.evaluate(() => document.body.dataset.printLayout));
await page.pdf({ path: '/tmp/mv2-normal-print.pdf', printBackground: true, preferCSSPageSize: true });
log('normal print pdf info:', execFileSync('pdfinfo', ['/tmp/mv2-normal-print.pdf']).toString().split('\n').filter((line) => /Pages|Page size/.test(line)).join(' | '));

// Backup lives inside Settings, and still contains travel data.
await page.getByRole('link', { name: 'সেটিংস' }).first().click();
await page.getByRole('heading', { name: 'ব্যাকআপ ও রিস্টোর' }).waitFor();
const backupDownloadPromise = page.waitForEvent('download', { timeout: 60000 });
await page.getByRole('button', { name: 'JSON ব্যাকআপ ডাউনলোড' }).click({ noWaitAfter: true });
const backupDownload = await backupDownloadPromise;
await backupDownload.saveAs('/tmp/mv2-backup.json');
const backup = JSON.parse(fs.readFileSync('/tmp/mv2-backup.json', 'utf8'));
log('backup travel entries:', backup.data.expenses.filter((e) => e.travelDetails).length);

log('errors:', errors);
await browser.close();
