// @ts-nocheck
"use client";

import AppShell, { PageHead } from "@/components/AppShell";
import PeopleManager from "@/components/PeopleManager";

export default function TeacherStudentsPage() {
  return (
    <AppShell>
      <PageHead
        title="My Students"
        tamil="எனது மாணவர்கள்"
        breadcrumb={
          <>
            <a href="/teacher">Dashboard</a> <span>/</span> Students
          </>
        }
      >
        <span className="small muted">
          Add students one by one or import the whole class roster from a CSV file.
        </span>
      </PageHead>

      <PeopleManager role="student" showClassColumn />
    </AppShell>
  );
}
