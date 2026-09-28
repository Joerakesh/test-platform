// @ts-nocheck
"use client";

import { useState } from "react";
import Link from "next/link";
import AppShell, { PageHead } from "@/components/AppShell";
import { Alert, Badge, EmptyState, Loading } from "@/components/Primitives";
import Pagination, { usePagedRows } from "@/components/Pagination";
import { DownloadButton } from "@/components/Download";
import { useApiData } from "@/lib/useApiData";
import { api, errorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

const STATUS_TONE = { active: "green", upcoming: "gold", ended: "grey", closed: "grey" };

export default function SessionsPage() {
  const { data, loading, error } = useApiData("/api/sessions");
  const [status, setStatus] = useState("");
  const [actionError, setActionError] = useState("");

  const sessions = data?.sessions || [];

  const filtered = status ? sessions.filter((s) => s.status === status) : sessions;
  const paged = usePagedRows(filtered, 12);

  return (
    <AppShell>
      <PageHead
        title="Test Sessions"
        tamil="தேர்வு அமர்வுகள்"
        breadcrumb={
          <>
            <a href="/teacher">Dashboard</a> <span>/</span> Sessions
          </>
        }
      >
        <Link className="btn" href="/teacher/sessions/new">
          + Schedule a test
        </Link>
      </PageHead>

      {error && <Alert type="error">{error}</Alert>}
      {actionError && <Alert type="error">{actionError}</Alert>}

      <div className="card">
        <div className="card-head">
          <div className="card-title">
            All sessions
            <span className="card-title-tamil tamil">அனைத்து அமர்வுகள்</span>
            <span className="tab-count">{filtered.length}</span>
          </div>
          <div className="row-wrap">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ width: "auto", margin: 0 }}
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              <option value="upcoming">Scheduled</option>
              <option value="active">Live now</option>
              <option value="ended">Ended</option>
            </select>
          </div>
        </div>

        {loading ? (
          <Loading />
        ) : paged.total === 0 ? (
          <EmptyState
            icon="🗓"
            title={sessions.length === 0 ? "No test sessions yet" : "Nothing matches your filter"}
            action={
              sessions.length === 0 ? (
                <Link className="btn" href="/teacher/sessions/new">
                  Schedule your first test
                </Link>
              ) : (
                <button className="btn btn-outline" onClick={() => setStatus("")}>
                  Clear filter
                </button>
              )
            }
          >
            {sessions.length === 0
              ? "Choose a paper, pick a time window and assign a class or individual students."
              : "Try a different filter."}
          </EmptyState>
        ) : (
          <>
            <div className="table-wrap" style={{ border: 0, borderRadius: 0, boxShadow: "none" }}>
              <table>
                <thead>
                  <tr>
                    <th>Paper</th>
                    <th>Window</th>
                    <th>Assigned</th>
                    <th className="right">Submitted</th>
                    <th className="right">Avg</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {paged.visible.map((s) => (
                    <tr key={s.id}>
                      <td className="cell-primary">
                        <Link href={`/teacher/sessions/${s.id}`}>{s.test?.title || "—"}</Link>
                        {s.test?.subject && <div className="cell-sub">{s.test.subject}</div>}
                      </td>
                      <td className="cell-sub">
                        {formatDateTime(s.startTime)}
                        <br />
                        to {formatDateTime(s.endTime)}
                      </td>
                      <td className="mono">{s.assignedCount}</td>
                      <td className="right mono">
                        {s.attemptCount}
                        <span className="cell-sub"> / {s.assignedCount}</span>
                      </td>
                      <td className="right mono">
                        {s.averagePercentage ? `${s.averagePercentage}%` : "—"}
                      </td>
                      <td>
                        <Badge tone={STATUS_TONE[s.status]} live={s.status === "active"}>
                          {s.statusLabel}
                        </Badge>
                      </td>
                      <td>
                        <div className="table-actions">
                          <Link className="btn btn-outline btn-sm" href={`/teacher/sessions/${s.id}`}>
                            Open
                          </Link>
                          <Link className="btn btn-quiet btn-sm" href={`/teacher/sessions/${s.id}/results`}>
                            Results
                          </Link>
                          <DownloadButton
                            buildUrl={() => `/api/sessions/${s.id}/export?type=summary`}
                            label="CSV"
                            className="btn btn-quiet btn-sm"
                            icon="⬇"
                          />
                        </div>
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
                label="sessions"
              />
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
