import type { Expense } from '../../db/types';
import { formatNumber, formatTaka } from '../../lib/format';
import { formatDateBn, formatVoucherDate } from '../../lib/dates';

interface TravelVoucherDocumentProps {
  expenses: Expense[];
  categoryName: string;
  userName: string;
}

/**
 * A4 portrait travel voucher. Every travel entry of the selected date is
 * combined into one table so a single sheet documents the whole day.
 */
export function TravelVoucherDocument({
  expenses,
  categoryName,
  userName,
}: TravelVoucherDocumentProps) {
  const total = expenses.reduce((sum, expense) => sum + expense.totalAmount, 0);
  const firstDate = expenses[0]?.date ?? '';
  const totalPassengers = expenses.reduce(
    (sum, expense) => sum + (expense.travelDetails?.passengers ?? 0),
    0,
  );

  return (
    <article
      className="travel-voucher-paper"
      aria-label={`যাতায়াত ভাউচার, ${formatDateBn(firstDate)}`}
    >
      <div className="travel-voucher-inner">
        <header className="travel-voucher-header">
          <h1 className="travel-voucher-title">যাতায়াত ভাউচার</h1>
          <div className="travel-voucher-meta">
            <p>
              <span>খাত: </span>
              <strong>{categoryName}</strong>
            </p>
          </div>
        </header>

        <div className="travel-voucher-rule" />

        <table className="travel-voucher-table">
          <thead>
            <tr>
              <th scope="col" className="col-serial">ক্রম</th>
              <th scope="col" className="col-date">তারিখ</th>
              <th scope="col" className="col-place">কোথা থেকে</th>
              <th scope="col" className="col-place">কোথায়</th>
              <th scope="col" className="col-number">কতজন</th>
              <th scope="col" className="col-number">পরিমাণ</th>
              <th scope="col" className="col-mode">মাধ্যম</th>
              <th scope="col" className="col-purpose">উদ্দেশ্য</th>
              <th scope="col" className="col-total">মোট টাকা</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense, index) => {
              const details = expense.travelDetails;
              const perPerson =
                expense.unitPrice ??
                (details && details.passengers > 0
                  ? expense.totalAmount / details.passengers
                  : expense.totalAmount);
              return (
                <tr key={expense.id}>
                  <td className="col-serial">{formatNumber(index + 1)}</td>
                  <td className="col-date">{formatVoucherDate(expense.date)}</td>
                  <td className="col-place">{details?.from ?? '—'}</td>
                  <td className="col-place">{details?.to ?? '—'}</td>
                  <td className="col-number">
                    {formatNumber(details?.passengers ?? expense.quantity)}
                  </td>
                  <td className="col-number">{formatNumber(perPerson)}</td>
                  <td className="col-mode">{details?.mode ?? '—'}</td>
                  <td className="col-purpose">{details?.purpose ?? '—'}</td>
                  <td className="col-total">{formatNumber(expense.totalAmount)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4}>সর্বমোট</td>
              <td className="col-number">{formatNumber(totalPassengers)} জন</td>
              <td colSpan={3} />
              <td className="col-total">{formatTaka(total)}</td>
            </tr>
          </tfoot>
        </table>

        <div className="travel-voucher-total">
          <span>মোট টাকা:</span>
          <strong>{formatTaka(total)}</strong>
        </div>

        <div className="travel-voucher-signature">
          <p className="travel-voucher-signature-label">প্রস্তুতকারীর স্বাক্ষর</p>
          <div className="travel-voucher-signature-line" />
          <p className="travel-voucher-signature-name">{userName}</p>
        </div>
      </div>
    </article>
  );
}
