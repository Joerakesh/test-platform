// @ts-nocheck
"use client";

import AppShell, { PageHead } from "@/components/AppShell";
import PeopleManager from "@/components/PeopleManager";

export default function AdminTeachersPage() {
  return (
    <AppShell>
      <PageHead
        title="Teacher Accounts"
        tamil="ஆசிரியர் கணக்குகள்"
        breadcrumb={
          <>
            <a href="/admin">Dashboard</a> <span>/</span> Teachers
          </>
        }
      >
        <span className="small muted">
          Teachers create their own students, papers and test sessions.
        </span>
      </PageHead>

      <PeopleManager role="teacher" showClassColumn={false} />
    </AppShell>
  );
}
