"use client";

import AppShell, { PageHead } from "@/components/AppShell";
import ClassesManager from "@/components/ClassesManager";

export default function TeacherClassesPage() {
  return (
    <AppShell>
      <PageHead
        title="Classes & Sections"
        tamil="வகுப்புகள் மற்றும் பிரிவுகள்"
        breadcrumb={
          <>
            <a href="/teacher">Dashboard</a> <span>/</span> Classes
          </>
        }
      >
        <span className="small muted">
          Assign a whole class to a test instead of picking students one by one.
        </span>
      </PageHead>

      <ClassesManager />
    </AppShell>
  );
}
