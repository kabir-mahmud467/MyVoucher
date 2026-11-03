import { Capacitor } from '@capacitor/core';

export type PdfDelivery = 'downloaded' | 'shared' | 'saved';

/**
 * a5                      – one A5 portrait sheet (single voucher)
 * a4-landscape-duplicate  – the same A5 voucher twice on an A4 landscape sheet
 * a4-landscape-single     – one A5 portrait voucher on an A4 landscape sheet
 * a4-portrait             – one A4 portrait sheet (travel voucher table)
 */
export type VoucherLayout =
  | 'a5'
  | 'a4-landscape-duplicate'
  | 'a4-landscape-single'
  | 'a4-portrait';

interface DownloadOptions {
  filename: string;
  layout?: VoucherLayout;
  dialogTitle?: string;
}

async function renderCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
  // WebView fonts can occasionally never resolve; never block PDF creation on it.
  await Promise.race([
    document.fonts.ready,
    new Promise<void>((resolve) => window.setTimeout(resolve, 1500)),
  ]);
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  if (!element.offsetWidth || !element.offsetHeight) {
    await new Promise<void>((resolve) => window.setTimeout(resolve, 120));
  }

  const [{ default: html2canvas }] = await Promise.all([import('html2canvas')]);
  const native = Capacitor.isNativePlatform();
  // Android WebView has tighter canvas memory limits, so start lower there.
  const scales = native ? [2, 1.5, 1] : [3, 2, 1.5];

  let lastError: unknown = null;
  for (const scale of scales) {
    try {
      return await html2canvas(element, {
        scale,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        logging: false,
        imageTimeout: 0,
        width: element.offsetWidth,
        height: element.offsetHeight,
        windowWidth: element.offsetWidth,
        windowHeight: element.offsetHeight,
        scrollX: 0,
        scrollY: 0,
      });
    } catch (error) {
      lastError = error;
      console.warn(`PDF canvas render failed at scale ${scale}`, error);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('ভাউচারের ছবি তৈরি করা যায়নি।');
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      resolve(result.substring(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error('PDF ফাইল পড়া যায়নি।'));
    reader.readAsDataURL(blob);
  });
}

export async function createVoucherPdfBlob(
  element: HTMLElement,
  layout: VoucherLayout = 'a5',
): Promise<Blob> {
  const [{ jsPDF }, canvas] = await Promise.all([import('jspdf'), renderCanvas(element)]);
  const imageData = canvas.toDataURL('image/jpeg', 0.98);

  if (layout === 'a4-landscape-duplicate') {
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });
    // Two identical A5 portrait copies side by side, ready to cut apart.
    pdf.addImage(imageData, 'JPEG', 0.5, 0, 148, 210, undefined, 'FAST');
    pdf.addImage(imageData, 'JPEG', 148.5, 0, 148, 210, undefined, 'FAST');
    return pdf.output('blob');
  }

  if (layout === 'a4-landscape-single') {
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });
    // One A5 voucher on A4 landscape. Batch downloads fill the other half
    // with a different voucher instead of duplicating this one.
    pdf.addImage(imageData, 'JPEG', 0.5, 0, 148, 210, undefined, 'FAST');
    return pdf.output('blob');
  }

  if (layout === 'a4-portrait') {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });
    pdf.addImage(imageData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
    return pdf.output('blob');
  }

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5',
    compress: true,
  });
  pdf.addImage(imageData, 'JPEG', 0, 0, 148, 210, undefined, 'FAST');
  return pdf.output('blob');
}

async function deliverPdfBlob(
  blob: Blob,
  filename: string,
  dialogTitle?: string,
): Promise<PdfDelivery> {
  if (Capacitor.isNativePlatform()) {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import('@capacitor/filesystem'),
      import('@capacitor/share'),
    ]);
    const base64 = await blobToBase64(blob);
    const file = await Filesystem.writeFile({
      path: filename,
      data: base64,
      directory: Directory.Cache,
      recursive: true,
    });
    try {
      await Share.share({
        title: 'MyVoucher ভাউচার',
        text: 'MyVoucher ভাউচার — সংরক্ষণ বা প্রিন্ট করতে অ্যাপ নির্বাচন করুন।',
        url: file.uri,
        dialogTitle: dialogTitle ?? 'PDF সংরক্ষণ বা শেয়ার করুন',
      });
      return 'shared';
    } catch (error) {
      // Some Android WebViews have no share target or reject the file URI.
      // Keep the PDF accessible in Documents instead of failing outright.
      console.warn('PDF share failed, saving to Documents', error);
      await Filesystem.writeFile({
        path: `MyVoucher/${filename}`,
        data: base64,
        directory: Directory.Documents,
        recursive: true,
      });
      return 'saved';
    }
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  return 'downloaded';
}

export async function downloadVoucherPdf(
  element: HTMLElement,
  options: DownloadOptions,
): Promise<PdfDelivery> {
  const { filename, layout = 'a5', dialogTitle } = options;
  const blob = await createVoucherPdfBlob(element, layout);
  return deliverPdfBlob(blob, filename, dialogTitle);
}

/**
 * Builds one PDF with an A5 voucher from each element. Two different
 * vouchers share each A4 landscape sheet (side by side); a lone trailing
 * voucher keeps the left half. The same voucher is never duplicated.
 */
export async function createBatchVoucherPdfBlob(elements: HTMLElement[]): Promise<Blob> {
  if (elements.length === 0) {
    throw new Error('কোনো ভাউচার নির্বাচিত হয়নি।');
  }

  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  for (let index = 0; index < elements.length; index += 2) {
    if (index > 0) pdf.addPage('a4', 'landscape');
    const first = await renderCanvas(elements[index]);
    pdf.addImage(
      first.toDataURL('image/jpeg', 0.98),
      'JPEG',
      0.5,
      0,
      148,
      210,
      undefined,
      'FAST',
    );

    const secondElement = elements[index + 1];
    if (!secondElement) continue;
    const second = await renderCanvas(secondElement);
    pdf.addImage(
      second.toDataURL('image/jpeg', 0.98),
      'JPEG',
      148.5,
      0,
      148,
      210,
      undefined,
      'FAST',
    );
  }

  return pdf.output('blob');
}

export async function downloadBatchVoucherPdf(
  elements: HTMLElement[],
  options: { filename: string; dialogTitle?: string },
): Promise<PdfDelivery> {
  const blob = await createBatchVoucherPdfBlob(elements);
  return deliverPdfBlob(blob, options.filename, options.dialogTitle);
}

/**
 * Opens the browser print dialog with the right paper size. The print portal in
 * the page renders either two A5 vouchers on A4 landscape or one A4 portrait
 * travel voucher.
 */
export function printInLayout(layout: 'a4-landscape' | 'a4-portrait'): void {
  const landscape = layout === 'a4-landscape';
  const paper = landscape ? '297mm 210mm' : '210mm 297mm';
  const width = landscape ? '297mm' : '210mm';
  const height = landscape ? '210mm' : '297mm';

  const style = document.createElement('style');
  style.id = 'myvoucher-print-layout';
  style.textContent = `@page { size: ${paper}; margin: 0; } html, body { width: ${width} !important; height: ${height} !important; margin: 0 !important; padding: 0 !important; background: #fff !important; }`;

  document.head.appendChild(style);
  document.body.dataset.printLayout = layout;

  const cleanup = () => {
    style.remove();
    delete document.body.dataset.printLayout;
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);
  window.print();
  // Fallback for browsers that never fire afterprint.
  window.setTimeout(cleanup, 60_000);
}
