// @ts-nocheck
"use client";

import { useState } from "react";

export default function Pagination({ page, pageCount, total, pageSize, onPage, label = "records" }: any) {
  if (!pageSize) return null;
  const pages = Math.max(1, Math.ceil((total || 0) / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className="pagination">
      <span>
        Showing <strong>{from}</strong>–<strong>{to}</strong> of <strong>{total}</strong> {label}
      </span>
      {pages > 1 && (
        <span className="row" style={{ gap: 6 }}>
          <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
            ‹ Previous
          </button>
          <span className="mono small">
            {page} / {pages}
          </span>
          <button
            className="btn btn-outline btn-sm"
            disabled={page >= pages}
            onClick={() => onPage(page + 1)}
          >
            Next ›
          </button>
        </span>
      )}
    </div>
  );
}

export function usePagedRows(rows: any, pageSize = 12) {
  const [page, setPage] = useState(1);
  const total = (rows || []).length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * pageSize;
  return {
    page: safePage,
    setPage,
    pageCount,
    total,
    pageSize,
    visible: (rows || []).slice(start, start + pageSize),
  };
}
