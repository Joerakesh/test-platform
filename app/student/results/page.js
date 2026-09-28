"use client";

import Link from "next/link";
import AppShell, { PageHead } from "@/components/AppShell";
import { Alert, Badge, EmptyState, Loading, StatCard } from "@/components/Primitives";
import Pagination, { usePagedRows } from "@/components/Pagination";
import { useApiData } from "@/lib/useApiData";
import { formatDateTime, formatSeconds } from "@/lib/format";

export default function ResultsPage() {
  const { data, loading, error } = useApiData("/api/results");

  const results = data?.results || [];
  const summary = data?.summary;
  const paged = usePagedRows(results, 15);

  return (
    <AppShell>
      <PageHead
        title="My Results"
        tamil="எனது முடிவுகள்"
        breadcrumb={
          <>
            <a href="/student">My Tests</a> <span>/</span> Results
          </>
        }
      />

      {error && <Alert type="error">{error}</Alert>}

      {summary && (
        <div className="grid grid-4 mb-3">
          <StatCard label="Tests taken" value={summary.testsTaken} tone="blue" icon="📝" />
          <StatCard label="Published" value={summary.published} tone="green" icon="✔" />
          <StatCard label="Average" value={`${summary.average}%`} tone="gold" icon="📊" />
          <StatCard label="Best score" value={`${summary.best}%`} tone="green" icon="🏆" />
        </div>
      )}

      {loading ? (
        <Loading />
      ) : results.length === 0 ? (
        <EmptyState
          icon="📊"
          title="No results yet"
          action={
            <Link className="btn" href="/student">
              Go to My Tests
            </Link>
          }
        >
          Results appear here after your teacher publishes them.
        </EmptyState>
      ) : (
        <div className="card">
          <div className="card-head">
            <div className="card-title">
              All results
              <span className="card-title-tamil tamil">அனைத்து முடிவுகள்</span>
              <span className="tab-count">{results.length}</span>
            </div>
          </div>

          <div className="table-wrap" style={{ border: 0, borderRadius: 0, boxShadow: "none" }}>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Test</th>
                  <th>Subject</th>
                  <th>Date</th>
                  <th className="right">Score</th>
                  <th className="right">%</th>
                  <th className="right">Accuracy</th>
                  <th className="right">Time</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {paged.visible.map((r, i) => (
                  <tr key={r.id}>
                    <td className="muted">{(paged.page - 1) * paged.pageSize + i + 1}</td>
                    <td className="cell-primary">{r.test?.title || "—"}</td>
                    <td>{r.test?.subject || "—"}</td>
                    <td className="cell-sub">{formatDateTime(r.submittedAt)}</td>
                    <td className="right mono">
                      {r.visible ? `${r.score} / ${r.totalMarks}` : "—"}
                    </td>
                    <td className="right mono">
                      {r.percentage != null ? `${r.percentage}%` : "—"}
                    </td>
                    <td className="right mono">
                      {r.accuracy != null ? `${r.accuracy}%` : "—"}
                    </td>
                    <td className="right mono">
                      {r.timeSpentSeconds ? formatSeconds(r.timeSpentSeconds) : "—"}
                    </td>
                    <td>
                      {r.visible ? (
                        <Badge tone="green">Published</Badge>
                      ) : (
                        <Badge tone="gold" title={r.hiddenReason}>
                          {r.status === "active" ? "In progress" : "Awaiting publication"}
                        </Badge>
                      )}
                    </td>
                    <td>
                      {r.visible && (
                        <Link className="btn btn-outline btn-sm" href={`/student/results/${r.id}`}>
                          Review
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card-foot">
            <Pagination
              page={paged.page}
              pageCount={paged.pageCount}
              total={paged.total}
              pageSize={paged.pageSize}
              onPage={paged.setPage}
              label="results"
            />
          </div>
        </div>
      )}
    </AppShell>
  );
}
