import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'নিশ্চিত করুন',
  cancelLabel = 'বাতিল',
  tone = 'danger',
  busy = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={busy ? () => undefined : onClose}
      title={title}
      size="sm"
      dismissible={!busy}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'অপেক্ষা করুন…' : confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex gap-3.5">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            tone === 'danger' ? 'bg-danger-soft text-danger' : 'bg-primary-soft text-primary'
          }`}
        >
          <AlertTriangle size={19} />
        </span>
        <p className="pt-1 text-sm leading-7 text-muted">{description}</p>
      </div>
    </Modal>
  );
}
