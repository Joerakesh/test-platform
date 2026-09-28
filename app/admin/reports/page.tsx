// @ts-nocheck
"use client";

import AppShell, { PageHead } from "@/components/AppShell";
import { Alert, EmptyState, Loading, StatCard } from "@/components/Primitives";
import { DownloadButton } from "@/components/Download";
import { useApiData } from "@/lib/useApiData";

function GroupTable({ title, tamil, rows, metricLabel = "Average" }) {
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">
          {title}
          <span className="card-title-tamil tamil">{tamil}</span>
        </div>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon="📊" title="Nothing to report yet" />
      ) : (
        <div className="table-wrap" style={{ border: 0, borderRadius: 0, boxShadow: "none" }}>
          <table>
            <thead>
              <tr>
                <th>{title.replace(" performance", "")}</th>
                <th className="right">Attempts</th>
                <th className="right">{metricLabel}</th>
                <th className="right">Pass rate</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label}>
                  <td className="cell-primary">{r.label}</td>
                  <td className="right mono">{r.attempts}</td>
                  <td className="right mono">{r.average}%</td>
                  <td className="right mono">{r.passPercentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AdminReportsPage() {
  const { data, loading, error } = useApiData("/api/reports");

  return (
    <AppShell>
      <PageHead
        title="School Reports"
        tamil="பள்ளி அறிக்கைகள்"
        breadcrumb={
          <>
            <a href="/admin">Dashboard</a> <span>/</span> Reports
          </>
        }
      >
        <DownloadButton
          buildUrl={() => "/api/reports?format=csv"}
          label="Download all records (CSV)"
          className="btn"
        />
      </PageHead>

      {error && <Alert type="error">{error}</Alert>}
      {loading && <Loading />}

      {data && (
        <>
          <div className="grid grid-4 mb-3">
            <StatCard label="Total submissions" value={data.totals.attempts} tone="red" icon="📊" />
            <StatCard label="School average" value={`${data.totals.averagePercentage}%`} tone="gold" />
            <StatCard label="Overall pass rate" value={`${data.totals.passPercentage}%`} tone="green" />
            <StatCard label="Test papers" value={data.totals.tests} tone="blue" icon="📝" />
          </div>

          <div className="grid grid-2">
            <GroupTable title="Subject performance" tamil="பாடம் விளக்கம்" rows={data.bySubject} />
            <GroupTable title="Class performance" tamil="வகுப்பு விளக்கம்" rows={data.byClass} />
            <GroupTable title="Teacher performance" tamil="ஆசிரியர் விளக்கம்" rows={data.byTeacher} />
            <GroupTable title="Paper performance" tamil="வினாத்தாள் விளக்கம்" rows={data.byTest} />
          </div>
        </>
      )}
    </AppShell>
  );
}
