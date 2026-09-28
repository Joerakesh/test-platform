// @ts-nocheck
"use client";

import { useState } from "react";

export function DownloadLink({ href, label = "Download CSV", className = "btn btn-outline", icon = "⬇" }: any) {
  return (
    <a className={className} href={href} download>
      <span aria-hidden="true">{icon}</span>
      {label}
    </a>
  );
}

export function DownloadButton({ buildUrl, label = "Download CSV", className = "btn btn-outline", icon = "⬇" }: any) {
  const [busy, setBusy] = useState(false);

  function trigger() {
    setBusy(true);
    const link = document.createElement("a");
    link.href = buildUrl();
    link.download = "";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setBusy(false), 900);
  }

  return (
    <button className={className} onClick={trigger} disabled={busy} type="button">
      {busy ? <span className="spinner spinner-sm" /> : <span aria-hidden="true">{icon}</span>}
      {label}
    </button>
  );
}
