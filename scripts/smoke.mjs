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

await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
console.log('title:', await page.title());
console.log('onboarding:', await page.getByText('স্বাগতম MyVoucher-এ').count());
await page.screenshot({ path: '/tmp/mv-onboarding.png', fullPage: true });

await page.getByLabel('আপনার নাম').fill('কবির মাহমুদ');
await page.getByRole('button', { name: 'শুরু করুন' }).click();
await page.getByRole('heading', { name: /কবির/ }).waitFor({ timeout: 15000 });
console.log('dashboard heading:', await page.locator('h1').first().innerText());
await page.screenshot({ path: '/tmp/mv-dashboard-empty.png', fullPage: true });

// add automatic expense
await page.getByRole('button', { name: 'নতুন খরচ' }).first().click();
await page.locator('#expense-category').selectOption({ label: 'আপ্যায়ন' });
await page.locator('#expense-description').fill('অতিথি আপ্যায়ন');
await page.getByRole('button', { name: 'স্বয়ংক্রিয়' }).click();
await page.locator('#expense-quantity').fill('2');
await page.locator('#expense-unit-price').fill('250');
console.log('auto preview:', await page.getByText('৳ ৫০০').count());
await page.screenshot({ path: '/tmp/mv-expense-modal.png', fullPage: true });
await page.getByRole('button', { name: 'খরচ যোগ করুন', exact: true }).click();
await page.getByText('নতুন খরচ যোগ হয়েছে।').waitFor();
console.log('after add dashboard total:', await page.locator('.money').first().innerText());

// expenses page
await page.getByRole('link', { name: 'খরচের হিসাব' }).first().click();
await page.getByRole('heading', { name: 'খরচের খাতা' }).waitFor();
const headers = await page.locator('thead th').allInnerTexts();
console.log('headers:', headers);
console.log('rows:', await page.locator('tbody tr').count());
await page.screenshot({ path: '/tmp/mv-expenses.png', fullPage: true });

// add manual expense
await page.getByRole('button', { name: 'নতুন খরচ' }).click();
await page.locator('#expense-category').selectOption({ label: 'যাতায়াত' });
await page.locator('#expense-description').fill('বাস ভাড়া');
await page.locator('#expense-total').fill('100');
await page.getByRole('button', { name: 'খরচ যোগ করুন', exact: true }).click();
await page.getByText('নতুন খরচ যোগ হয়েছে।').waitFor();
console.log('rows after manual:', await page.locator('tbody tr').count());

// inline edit description of first row
const descInput = page.locator('tbody tr').first().getByLabel('খরচের বিবরণ');
await descInput.fill('বাস ভাড়া — অফিস');
await descInput.blur();
await page.waitForTimeout(900);
await page.reload({ waitUntil: 'networkidle' });
await page.getByRole('heading', { name: 'খরচের খাতা' }).waitFor();
console.log('edited desc:', await page.locator('tbody tr').first().getByLabel('খরচের বিবরণ').inputValue());

// voucher
await page.locator('tbody tr').first().getByRole('link', { name: /ভাউচার দেখুন/ }).click();
await page.getByRole('heading', { name: 'A5 ভাউচার' }).waitFor();
const voucherText = await page.locator('.voucher-paper').first().innerText();
console.log('voucher text:', voucherText);
console.log('has quantity label:', voucherText.includes('পরিমাণ'), 'has unit price:', voucherText.includes('একক মূল্য'));
await page.screenshot({ path: '/tmp/mv-voucher.png', fullPage: true });

// PDF
const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
await page.getByRole('button', { name: 'PDF ডাউনলোড' }).click();
const download = await downloadPromise;
const pdfPath = '/tmp/' + download.suggestedFilename();
await download.saveAs(pdfPath);
console.log('pdf:', download.suggestedFilename(), fs.statSync(pdfPath).size);

// dashboard stats
await page.getByRole('link', { name: 'ড্যাশবোর্ড' }).first().click();
await page.waitForTimeout(400);
await page.screenshot({ path: '/tmp/mv-dashboard.png', fullPage: true });

// mobile screenshot
await page.setViewportSize({ width: 390, height: 844 });
await page.reload({ waitUntil: 'networkidle' });
await page.screenshot({ path: '/tmp/mv-mobile-dashboard.png', fullPage: true });
await page.getByRole('link', { name: 'খরচ' }).last().click();
await page.waitForTimeout(300);
await page.screenshot({ path: '/tmp/mv-mobile-expenses.png', fullPage: true });

console.log('errors:', errors);
await browser.close();
