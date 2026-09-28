// @ts-nocheck
"use client";

import { useEffect } from "react";

export default function Modal({ open, onClose, title, tamil, children, footer, wide = false, closeOnBackdrop = true }: any) {
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className={`modal ${wide ? "modal-wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <div>
            <div className="modal-title">{title}</div>
            {tamil && <div className="card-title-tamil tamil">{tamil}</div>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = "Confirm", danger, busy }: any) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            className={`btn ${danger ? "btn-danger" : ""}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? <span className="spinner spinner-sm" /> : confirmLabel}
          </button>
        </>
      }
    >
      <div style={{ fontSize: 14.5, lineHeight: 1.6 }}>{message}</div>
    </Modal>
  );
}
