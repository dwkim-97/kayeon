'use client';

import {AlertTriangle, CheckCircle2, X} from 'lucide-react';

export type CustomAlertState =
  | {
      kind: 'closed';
    }
  | {
      kind: 'alert';
      title: string;
      message: string;
    }
  | {
      kind: 'confirm';
      title: string;
      message: string;
      confirmLabel: string;
      confirmVariant: 'primary' | 'danger';
      onConfirm: () => void;
    };

type CustomAlertProps = {
  state: CustomAlertState;
  onClose: () => void;
};

export const closedAlertState: CustomAlertState = {kind: 'closed'};

export function CustomAlert({state, onClose}: CustomAlertProps) {
  if (state.kind === 'closed') {
    return null;
  }

  const isConfirm = state.kind === 'confirm';
  const confirmClass =
    isConfirm && state.confirmVariant === 'danger'
      ? 'bg-[var(--danger)] text-white hover:bg-red-600'
      : 'bg-[var(--violet-600)] text-white hover:bg-[var(--violet-700)]';

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-[var(--violet-950)]/45 px-4 py-6">
      <section
        className="w-full max-w-sm rounded-[8px] border border-[var(--border)] bg-white p-5 shadow-[0_28px_90px_rgba(47,13,104,0.26)]"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="custom-alert-title"
      >
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] bg-[var(--violet-50)] text-[var(--violet-700)]">
            {isConfirm ? <AlertTriangle size={21} aria-hidden /> : <CheckCircle2 size={21} aria-hidden />}
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="custom-alert-title" className="text-lg font-extrabold text-[var(--violet-950)]">
              {state.title}
            </h2>
            <p className="mt-2 whitespace-pre-line break-keep text-sm leading-6 text-slate-600">{state.message}</p>
          </div>
          <button
            className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-slate-500 hover:bg-[var(--violet-50)]"
            type="button"
            onClick={onClose}
            aria-label="알럿 닫기"
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          {isConfirm ? (
            <button
              className="h-10 rounded-[8px] border border-[var(--border)] px-4 text-sm font-bold text-slate-600 hover:bg-slate-50"
              type="button"
              onClick={onClose}
            >
              아니오
            </button>
          ) : null}
          <button
            className={`h-10 rounded-[8px] px-4 text-sm font-bold transition ${isConfirm ? confirmClass : 'bg-[var(--violet-600)] text-white hover:bg-[var(--violet-700)]'}`}
            type="button"
            onClick={() => {
              if (state.kind === 'confirm') {
                state.onConfirm();
              }
              onClose();
            }}
          >
            {isConfirm ? state.confirmLabel : '확인'}
          </button>
        </div>
      </section>
    </div>
  );
}
