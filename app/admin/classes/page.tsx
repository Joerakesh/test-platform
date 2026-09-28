// @ts-nocheck
"use client";

import AppShell, { PageHead } from "@/components/AppShell";
import ClassesManager from "@/components/ClassesManager";

export default function AdminClassesPage() {
  return (
    <AppShell>
      <PageHead
        title="Classes & Sections"
        tamil="வகுப்புகள் மற்றும் பிரிவுகள்"
        breadcrumb={
          <>
            <a href="/admin">Dashboard</a> <span>/</span> Classes
          </>
        }
      >
        <span className="small muted">Classes are shared across all teachers.</span>
      </PageHead>

      <ClassesManager />
    </AppShell>
  );
}
