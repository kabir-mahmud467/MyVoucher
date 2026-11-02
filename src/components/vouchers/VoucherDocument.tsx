import { useLayoutEffect, useRef } from 'react';
import type { Expense } from '../../db/types';
import { formatTaka } from '../../lib/format';
import { formatVoucherDate } from '../../lib/dates';

interface VoucherDocumentProps {
  expense: Expense;
  categoryName: string;
  userName: string;
}

/**
 * The approved A5 voucher. Keep this layout intentionally minimal.
 * Only: heading, category (top left), date (top right), description,
 * total amount, and the preparer's signature block.
 */
export function VoucherDocument({ expense, categoryName, userName }: VoucherDocumentProps) {
  const descriptionRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = descriptionRef.current;
    if (!element) return;

    // Fit unusually long descriptions onto one A5 sheet without altering the
    // approved field set. Normal descriptions remain at the intended size.
    element.style.fontSize = '';
    let fontSize = 4.4;
    element.style.fontSize = `${fontSize}mm`;
    let guard = 0;
    while (element.scrollHeight > element.clientHeight && fontSize > 2.4 && guard < 30) {
      fontSize -= 0.15;
      element.style.fontSize = `${Math.max(fontSize, 2.4).toFixed(2)}mm`;
      guard += 1;
    }
  }, [expense.description]);

  return (
    <article
      className="voucher-paper"
      aria-label={`${categoryName} খরচের ভাউচার, ${formatVoucherDate(expense.date)}`}
    >
      <div className="voucher-inner">
        <h1 className="voucher-title">ভাউচার</h1>

        <div className="voucher-meta">
          <div>
            <span>খাত: </span>
            <span style={{ fontWeight: 600 }}>{categoryName}</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span>তারিখ: </span>
            <span style={{ fontWeight: 600 }}>{formatVoucherDate(expense.date)}</span>
          </div>
        </div>

        <div className="voucher-divider" />

        <div>
          <p className="voucher-description-label">বিবরণ:</p>
          <div ref={descriptionRef} className="voucher-description">
            {expense.description}
          </div>
        </div>

        <div className="voucher-total">
          <span>মোট টাকা:</span>
          <strong>{formatTaka(expense.totalAmount)}</strong>
        </div>

        <div className="voucher-signature">
          <div className="voucher-signature-line" />
          <p className="voucher-signature-name">{userName}</p>
          <p className="voucher-signature-label">প্রস্তুতকারীর স্বাক্ষর</p>
        </div>
      </div>
    </article>
  );
}
