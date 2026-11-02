import { Capacitor } from '@capacitor/core';
import type { Expense } from '../db/types';

export type PdfDelivery = 'downloaded' | 'shared';

export async function downloadVoucherPdf(
  element: HTMLElement,
  expense: Expense,
  options: { dialogTitle?: string } = {},
): Promise<PdfDelivery> {
  await document.fonts.ready;
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const canvas = await html2canvas(element, {
    scale: 3,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
    width: element.offsetWidth,
    height: element.offsetHeight,
    windowWidth: element.offsetWidth,
    windowHeight: element.offsetHeight,
    scrollX: 0,
    scrollY: 0,
  });

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5',
    compress: true,
  });

  const imageData = canvas.toDataURL('image/jpeg', 0.98);
  pdf.addImage(imageData, 'JPEG', 0, 0, 148, 210, undefined, 'FAST');
  const filename = `MyVoucher-Voucher-${expense.date}.pdf`;

  if (Capacitor.isNativePlatform()) {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import('@capacitor/filesystem'),
      import('@capacitor/share'),
    ]);
    const dataUri = pdf.output('datauristring');
    const base64 = dataUri.substring(dataUri.indexOf(',') + 1);
    const file = await Filesystem.writeFile({
      path: filename,
      data: base64,
      directory: Directory.Cache,
      recursive: true,
    });
    await Share.share({
      title: 'MyVoucher ভাউচার',
      text: 'MyVoucher A5 ভাউচার — সংরক্ষণ বা প্রিন্ট করতে অ্যাপ নির্বাচন করুন।',
      url: file.uri,
      dialogTitle: options.dialogTitle ?? 'PDF সংরক্ষণ বা শেয়ার করুন',
    });
    return 'shared';
  }

  pdf.save(filename);
  return 'downloaded';
}
