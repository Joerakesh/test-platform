"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell, { PageHead } from "@/components/AppShell";
import { Alert, Loading } from "@/components/Primitives";
import { useApiData } from "@/lib/useApiData";
import { api, errorMessage } from "@/lib/api";
import { toLocalInputValue } from "@/lib/format";

export default function NewSessionPage() {
  const router = useRouter();
  const { data: testsData, loading: loadingTests } = useApiData("/api/tests");
  const { data: studentsData, loading: loadingStudents } = useApiData("/api/users");
  const { data: classesData, loading: loadingClasses } = useApiData("/api/classes");

  const tests = testsData?.tests || [];
  const students = studentsData?.users || [];
  const classrooms = classesData?.classes || [];

  const [testId, setTestId] = useState("");
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedClassrooms, setSelectedClassrooms] = useState([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [instructions, setInstructions] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [assignMode, setAssignMode] = useState("class");

  const selectedTest = tests.find((t) => t._id === testId);

  useEffect(() => {
    if (selectedTest && !startTime) {
      const now = new Date();
      now.setMinutes(now.getMinutes() + 30);
      now.setSeconds(0, 0);
      const end = new Date(now);
      end.setMinutes(end.getMinutes() + (selectedTest.duration || 60));
      setStartTime(toLocalInputValue(now));
      setEndTime(toLocalInputValue(end));
    }
  }, [selectedTest, startTime]);

  function toggleStudent(id) {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleClassroom(id) {
    setSelectedClassrooms((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function selectAllStudents() {
    setSelectedStudents(students.map((s) => s._id));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api("/api/sessions", {
        method: "POST",
        body: {
          testId,
          assignedStudents: assignMode === "individual" ? selectedStudents : [],
          assignedClassrooms: assignMode === "class" ? selectedClassrooms : [],
          startTime,
          endTime,
          instructions,
        },
      });
      router.push("/teacher/sessions");
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  const loading = loadingTests || loadingStudents || loadingClasses;

  return (
    <AppShell>
      <PageHead
        title="Schedule a Test Session"
        tamil="தேர்வு அமர்வைத் திட்டமிடு"
        breadcrumb={
          <>
            <a href="/teacher">Dashboard</a>
            <span>/</span>
            <a href="/teacher/sessions">Sessions</a>
            <span>/</span> New
          </>
        }
      />

      {error && <Alert type="error">{error}</Alert>}

      {loading ? (
        <Loading />
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="grid grid-sidebar">
            <div>
              <div className="card mb-2">
                <div className="card-head">
                  <div className="card-title">
                    Paper &amp; timing
                    <span className="card-title-tamil tamil">தேர்வு மற்றும் நேரம்</span>
                  </div>
                </div>
                <div className="card-body">
                  <div className="field">
                    <label className="label" htmlFor="test">Select a test paper</label>
                    <select id="test" value={testId} onChange={(e) => setTestId(e.target.value)} required>
                      <option value="">Choose a paper…</option>
                      {tests.map((t) => (
                        <option key={t._id} value={t._id}>
                          {t.title} — {t.questionCount}Q · {t.totalMarks} marks · {t.duration} min
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedTest && (
                    <div className="alert alert-info" style={{ fontSize: 13 }}>
                      <strong>{selectedTest.title}</strong>
                      <div>{selectedTest.subject} · Class {selectedTest.className || "—"} · {selectedTest.questionCount} questions · {selectedTest.totalMarks} marks</div>
                    </div>
                  )}

                  <div className="form-grid">
                    <div className="field">
                      <label className="label" htmlFor="start">Start time</label>
                      <input id="start" type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
                    </div>
                    <div className="field">
                      <label className="label" htmlFor="end">End time</label>
                      <input id="end" type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
                    </div>
                  </div>

                  <div className="field">
                    <label className="label" htmlFor="instructions">Instructions (optional)</label>
                    <textarea
                      id="instructions"
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      placeholder="Any instructions for students before they begin the test…"
                      style={{ minHeight: 80 }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="card">
                <div className="card-head">
                  <div className="card-title">
                    Assign students
                    <span className="card-title-tamil tamil">மாணவர்களை நியமி</span>
                  </div>
                </div>
                <div className="card-body">
                  <div className="tab-bar mb-2">
                    <button type="button" className={`tab ${assignMode === "class" ? "active" : ""}`} onClick={() => setAssignMode("class")}>
                      By class
                    </button>
                    <button type="button" className={`tab ${assignMode === "individual" ? "active" : ""}`} onClick={() => setAssignMode("individual")}>
                      Individual
                    </button>
                  </div>

                  {assignMode === "class" ? (
                    <>
                      {classrooms.length === 0 ? (
                        <p className="muted small">No classes found. Create classes first from the Classes page.</p>
                      ) : (
                        <div className="stack" style={{ gap: 8 }}>
                          {classrooms.map((c) => (
                            <label key={c._id} className="checkbox-row" style={{ cursor: "pointer" }}>
                              <input
                                type="checkbox"
                                checked={selectedClassrooms.includes(c._id)}
                                onChange={() => toggleClassroom(c._id)}
                                style={{ width: "auto" }}
                              />
                              <span>
                                Class {c.name}-{c.section}
                                {c.studentCount != null && <span className="muted small"> ({c.studentCount} students)</span>}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="row-wrap mb-2">
                        <button type="button" className="btn btn-outline btn-sm" onClick={selectAllStudents}>
                          Select all
                        </button>
                        <button type="button" className="btn btn-outline btn-sm" onClick={() => setSelectedStudents([])}>
                          Clear
                        </button>
                        <span className="small muted">{selectedStudents.length} selected</span>
                      </div>
                      {students.length === 0 ? (
                        <p className="muted small">No students found. Add students first.</p>
                      ) : (
                        <div className="stack" style={{ gap: 4, maxHeight: 360, overflowY: "auto" }}>
                          {students.map((s) => (
                            <label key={s._id} className="checkbox-row" style={{ cursor: "pointer", padding: "4px 0" }}>
                              <input
                                type="checkbox"
                                checked={selectedStudents.includes(s._id)}
                                onChange={() => toggleStudent(s._id)}
                                style={{ width: "auto" }}
                              />
                              <span className="small">
                                {s.name}
                                {s.username && <span className="muted"> ({s.username})</span>}
                                {s.classroomId && <span className="muted"> · {s.classroomId.name}-{s.classroomId.section}</span>}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <button
                className="btn btn-block mt-2"
                type="submit"
                disabled={busy || !testId || (!selectedClassrooms.length && !selectedStudents.length)}
              >
                {busy ? <span className="spinner spinner-sm" /> : "Create Session"}
              </button>
            </div>
          </div>
        </form>
      )}
    </AppShell>
  );
}
