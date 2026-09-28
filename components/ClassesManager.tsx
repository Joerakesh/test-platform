// @ts-nocheck
"use client";

import { useState } from "react";
import { Alert, Badge, EmptyState, Loading, StatCard } from "@/components/Primitives";
import { ConfirmDialog } from "@/components/Modal";
import { api, errorMessage } from "@/lib/api";
import { useApiData } from "@/lib/useApiData";
import { CLASSES, SECTIONS, SCHOOL } from "@/lib/school";

export default function ClassesManager() {
  const { data, loading, error, reload } = useApiData("/api/classes?counts=1");
  const [name, setName] = useState(CLASSES[0] || "9");
  const [section, setSection] = useState("A");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [created, setCreated] = useState("");
  const [confirm, setConfirm] = useState(null);
  const [removing, setRemoving] = useState(false);

  const classrooms = data?.classrooms || [];
  const totalStudents = classrooms.reduce((s, c) => s + c.studentCount, 0);

  async function create(e) {
    e.preventDefault();
    setBusy(true);
    setFormError("");
    setCreated("");
    try {
      const res = await api("/api/classes", { method: "POST", body: { name, section } });
      setCreated(`Class ${res.classroom.name}-${res.classroom.section} was created.`);
      setName(CLASSES[(CLASSES.indexOf(name) + 1) % CLASSES.length]);
      await reload(true);
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setRemoving(true);
    setFormError("");
    try {
      await api(`/api/classes/${confirm._id}`, { method: "DELETE" });
      setConfirm(null);
      await reload(true);
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setRemoving(false);
    }
  }

  const byClass = classrooms.reduce((acc, c) => {
    if (!acc[c.name]) acc[c.name] = [];
    acc[c.name].push(c);
    return acc;
  }, {});

  return (
    <>
      {error && <Alert type="error">{error}</Alert>}
      {formError && <Alert type="error">{formError}</Alert>}
      {created && <Alert type="success">{created}</Alert>}

      <div className="grid grid-3 mb-3">
        <StatCard label="Classes" value={classrooms.length} tone="red" icon="🏫" />
        <StatCard label="Sections" value={new Set(classrooms.map((c) => c.section)).size} tone="gold" />
        <StatCard label="Students placed" value={totalStudents} tone="blue" icon="👦" />
      </div>

      <div className="grid grid-sidebar">
        <div className="card">
          <div className="card-head">
            <div className="card-title">
              Classes &amp; sections
              <span className="card-title-tamil tamil">வகுப்புகள் மற்றும் பிரிவுகள்</span>
            </div>
            <span className="small muted">Academic year {SCHOOL.academicYear}</span>
          </div>

          {loading ? (
            <Loading />
          ) : classrooms.length === 0 ? (
            <EmptyState icon="🏫" title="No classes yet">
              Create a class such as <strong>9-A</strong> so you can assign whole classes of students to
              a test at once.
            </EmptyState>
          ) : (
            <div className="table-wrap" style={{ border: 0, borderRadius: 0, boxShadow: "none" }}>
              <table>
                <thead>
                  <tr>
                    <th>Class</th>
                    <th>Section</th>
                    <th>Label</th>
                    <th className="right">Students</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {classrooms.map((c) => (
                    <tr key={c._id}>
                      <td className="cell-primary mono">{c.name}</td>
                      <td className="mono">{c.section}</td>
                      <td>
                        <Badge tone="blue">
                          {c.name}-{c.section}
                        </Badge>
                      </td>
                      <td className="right mono">{c.studentCount}</td>
                      <td>
                        <div className="table-actions">
                          <button
                            className="btn btn-quiet btn-sm"
                            onClick={() => setConfirm(c)}
                            disabled={c.studentCount > 0}
                            title={
                              c.studentCount > 0
                                ? "Move the students to another class first"
                                : "Remove this class"
                            }
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <div className="card card-accent">
            <div className="card-head">
              <div className="card-title">Add a class</div>
            </div>
            <form className="card-body" onSubmit={create}>
              <div className="field">
                <label className="label" htmlFor="cl-name">
                  Class
                </label>
                <select id="cl-name" value={name} onChange={(e) => setName(e.target.value)}>
                  {CLASSES.map((c) => (
                    <option key={c} value={c}>
                      Class {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="label" htmlFor="cl-section">
                  Section
                </label>
                <select id="cl-section" value={section} onChange={(e) => setSection(e.target.value)}>
                  {SECTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <button className="btn btn-block" type="submit" disabled={busy}>
                {busy ? <span className="spinner spinner-sm" /> : "Create class"}
              </button>
            </form>
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-title">Enrolment summary</div>
            </div>
            <div className="card-body">
              {Object.keys(byClass).length === 0 ? (
                <p className="muted small mb-0">No classes created yet.</p>
              ) : (
                <div className="stack" style={{ gap: 10 }}>
                  {Object.entries(byClass).map(([className, list]) => (
                    <div key={className} className="spread">
                      <strong className="small">Class {className}</strong>
                      <span className="row-wrap" style={{ gap: 5 }}>
                        {list.map((c) => (
                          <Badge key={c._id} tone={c.studentCount > 0 ? "gold" : "grey"}>
                            {c.section} · {c.studentCount}
                          </Badge>
                        ))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={remove}
        busy={removing}
        danger
        title="Remove class?"
        confirmLabel="Remove class"
        message={`Class ${confirm?.name}-${confirm?.section} will be removed. This can only be done when it has no students.`}
      />
    </>
  );
}
