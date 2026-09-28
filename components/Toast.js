"use client";

import { useEffect } from "react";
import Seal from "./Seal";
import { SCHOOL } from "@/lib/school";

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4200);
    return () => clearTimeout(t);
  }, [toast.id, onClose]);

  return (
    <div className={`toast ${toast.type === "error" ? "toast-error" : ""} ${toast.type === "success" ? "toast-success" : ""}`}>
      <span>{toast.type === "error" ? "⚠" : toast.type === "success" ? "✔" : "ℹ"}</span>
      <span className="grow">{toast.message}</span>
      <button className="icon-btn" onClick={onClose} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}
