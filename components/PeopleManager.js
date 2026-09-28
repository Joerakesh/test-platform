"use client";

import { useMemo, useState } from "react";
import Modal, { ConfirmDialog } from "@/components/Modal";
import CsvUploader from "@/components/CsvUploader";
import { Alert, Badge, EmptyState, Loading } from "@/components/Primitives";
import Pagination, { usePagedRows } from "@/components/Pagination";
import { DownloadLink } from "@/components/Download";
import { api, errorMessage } from "@/lib/api";
import { useApiData } from "@/lib/useApiData";
import { formatDateTime } from "@/lib/format";
import { CLASSES, SECTIONS, SCHOOL, SUBJECTS } from "@/lib/school";
import { STUDENT_CSV_HEADERS } from "@/lib/csv";

const ROLE_COPY = {
  teacher: {
    singular: "teacher",
    plural: "Teachers",
    tamil: "ஆசிரியர்கள்",
    usernameLabel: null,
  },
  student: {
    singular: "student",
    plural: "Students",
    tamil: "மாணவர்கள்",
    usernameLabel: "Register number",
  },
};

function blankForm(role) {
  return {
    name: "",
    email: "",
    username: "",
    rollNo: "",
    subject: "",
    className: role === "student" ? "" : "",
    section: role === "student" ? "A" : "",
    password: "",
  };
}

export default function PeopleManager({ role, showClassColumn = true }) {
  const copy = ROLE_COPY[role];
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const { data, loading, error, reload } = useApiData("/api/classes?counts=1");

  const usersQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (classFilter) params.set("classroomId", classFilter);
    return `/api/users${params.toString() ? `?${params}` : ""}`;
  }, [classFilter]);

  const users = useApiData(usersQuery);
  const rows = users.data?.users || [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((u) =>
      [u.name, u.email, u.username, u.rollNo].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [rows, search]);

  const paged = usePagedRows(filtered, 15);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankForm(role));
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [issued, setIssued] = useState([]);
  const [passwordNotice, setPasswordNotice] = useState("");

  const [importOpen, setImportOpen] = useState(false);
  const [importCsv, setImportCsv] = useState("");
  const [importDefaults, setImportDefaults] = useState({ defaultPassword: "", className: "", section: "A" });
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState("");

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState("");

  function openCreate() {
    setEditing(null);
    setForm(blankForm(role));
    setFormError("");
    setPasswordNotice("");
    setIssued([]);
    setFormOpen(true);
  }

  function openEdit(user) {
    setEditing(user);
    setForm({
      name: user.name || "",
      email: user.email || "",
      username: user.username || "",
      rollNo: user.rollNo || "",
      subject: user.subject || "",
      className: user.classroomId?.name || "",
      section: user.classroomId?.section || "A",
      password: "",
    });
    setFormError("");
    setPasswordNotice("");
    setFormOpen(true);
  }

  async function save() {
    setFormError("");
    setSaving(true);
    try {
      if (editing) {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        const res = await api(`/api/users/${editing._id}`, { method: "PATCH", body: payload });
        setPasswordNotice(res.passwordReset ? `Password updated to "${form.password}".` : "");
        setFormOpen(false);
        await reload(true);
        await users.reload(true);
      } else {
        const res = await api("/api/users", { method: "POST", body: form });
        if (res.temporaryPassword) {
          setIssued([{ name: res.user.name, registerNo: res.user.username || res.user.email, password: res.temporaryPassword }]);
        } else {
          setIssued([]);
        }
        setFormOpen(false);
        await reload(true);
        await users.reload(true);
      }
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setDeleting(true);
    setActionError("");
    try {
      await api(`/api/users/${confirmDelete._id}`, { method: "DELETE" });
      setConfirmDelete(null);
      await reload(true);
      await users.reload(true);
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  async function toggleActive(user) {
    setActionError("");
    try {
      await api(`/api/users/${user._id}`, { method: "PATCH", body: { isActive: !user.isActive } });
      await users.reload(true);
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  async function runImport() {
    setImporting(true);
    setImportError("");
    setImportResult(null);
    try {
      const res = await api("/api/users/import", {
        method: "POST",
        body: {
          csv: importCsv,
          defaultPassword: importDefaults.defaultPassword,
          className: importDefaults.className,
          section: importDefaults.section,
          academicYear: SCHOOL.academicYear,
        },
      });
      setImportResult(res);
      await users.reload(true);
      await reload(true);
    } catch (err) {
      setImportError(errorMessage(err));
    } finally {
      setImporting(false);
    }
  }

  const templateHeaders = role === "student" ? STUDENT_CSV_HEADERS : ["name", "email", "subject", "password"];

  return (
    <>
      {error && <Alert type="error">{error}</Alert>}
      {actionError && <Alert type="error">{actionError}</Alert>}
      {passwordNotice && <Alert type="success">{passwordNotice}</Alert>}

      {issued.length > 0 && (
        <Alert type="warn" title="Copy these sign-in details now">
          <div className="stack mt-1" style={{ gap: 4 }}>
            {issued.map((i) => (
              <div key={i.registerNo} className="mono small">
                {i.name} — {i.registerNo} / {i.password}
              </div>
            ))}
          </div>
          <button className="btn btn-outline btn-sm mt-2" onClick={() => setIssued([])}>
            I have noted them down
          </button>
        </Alert>
      )}

      <div className="card">
        <div className="card-head">
          <div className="card-title">
            {copy.plural}
            <span className="card-title-tamil tamil">{copy.tamil}</span>
            <span className="tab-count">{filtered.length}</span>
          </div>

          <div className="row-wrap">
            <input
              type="search"
              placeholder={`Search ${copy.plural.toLowerCase()}…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 220, margin: 0 }}
              aria-label="Search"
            />
            {showClassColumn && (
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                style={{ width: "auto", margin: 0 }}
                aria-label="Filter by class"
              >
                <option value="">All classes</option>
                {(data?.classrooms || []).map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}-{c.section} ({c.studentCount})
                  </option>
                ))}
              </select>
            )}
            <button className="btn btn-outline btn-sm" onClick={() => setImportOpen(true)}>
              ⬆ Import CSV
            </button>
            <button className="btn btn-sm" onClick={openCreate}>
              + Add {copy.singular}
            </button>
          </div>
        </div>

        {users.loading ? (
          <Loading />
        ) : paged.total === 0 ? (
          <EmptyState
            icon={role === "student" ? "👦" : "👩‍🏫"}
            title={`No ${copy.plural.toLowerCase()} yet`}
            action={
              <div className="btn-group">
                <button className="btn" onClick={openCreate}>
                  Add one
                </button>
                <button className="btn btn-outline" onClick={() => setImportOpen(true)}>
                  Import from CSV
                </button>
              </div>
            }
          >
            Add accounts one at a time, or upload a CSV roster.
          </EmptyState>
        ) : (
          <>
            <div className="table-wrap" style={{ border: 0, borderRadius: 0, boxShadow: "none" }}>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    {role === "student" && <th>Register no</th>}
                    {showClassColumn && <th>Class</th>}
                    {role === "student" ? <th>Roll</th> : <th>Subject</th>}
                    <th>Email</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {paged.visible.map((u, i) => (
                    <tr key={u._id}>
                      <td className="mono muted">{(paged.page - 1) * paged.pageSize + i + 1}</td>
                      <td className="cell-primary">{u.name}</td>
                      {role === "student" && <td className="mono">{u.username || "—"}</td>}
                      {showClassColumn && (
                        <td>
                          {u.classroomId ? (
                            <span className="badge badge-blue">
                              {u.classroomId.name}-{u.classroomId.section}
                            </span>
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                      )}
                      {role === "student" ? (
                        <td className="mono">{u.rollNo || "—"}</td>
                      ) : (
                        <td>{u.subject || <span className="muted">—</span>}</td>
                      )}
                      <td className="cell-sub">{u.email || "—"}</td>
                      <td>
                        {u.isActive === false ? <Badge tone="grey">Inactive</Badge> : <Badge tone="green">Active</Badge>}
                      </td>
                      <td>
                        <div className="table-actions">
                          <button className="btn btn-outline btn-sm" onClick={() => openEdit(u)}>
                            Edit
                          </button>
                          <button className="btn btn-quiet btn-sm" onClick={() => toggleActive(u)}>
                            {u.isActive === false ? "Enable" : "Disable"}
                          </button>
                          <button className="btn btn-quiet btn-sm" onClick={() => setConfirmDelete(u)}>
                            Delete
                          </button>
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
                label={copy.plural.toLowerCase()}
              />
            </div>
          </>
        )}
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? `Edit ${copy.singular}` : `Add ${copy.singular}`}
        tamil={copy.tamil}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button className="btn" onClick={save} disabled={saving}>
              {saving ? <span className="spinner spinner-sm" /> : editing ? "Save changes" : "Create account"}
            </button>
          </>
        }
      >
        {formError && <Alert type="error">{formError}</Alert>}

        <div className="field">
          <label className="label" htmlFor="pm-name">
            Name <span className="label-tamil">பெயர்</span>
          </label>
          <input
            id="pm-name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            autoFocus
          />
        </div>

        {role === "student" ? (
          <>
            <div className="form-grid-2">
              <div className="field">
                <label className="label" htmlFor="pm-username">
                  Register number <span className="label-tamil">பதிவு எண்</span>
                </label>
                <input
                  id="pm-username"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value.toUpperCase() })}
                  placeholder="9A001"
                />
                <div className="hint">This is what the student types to sign in.</div>
              </div>
              <div className="field">
                <label className="label" htmlFor="pm-roll">
                  Roll number
                </label>
                <input
                  id="pm-roll"
                  value={form.rollNo}
                  onChange={(e) => setForm({ ...form, rollNo: e.target.value })}
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="field">
                <label className="label" htmlFor="pm-class">
                  Class <span className="label-tamil">வகுப்பு</span>
                </label>
                <select
                  id="pm-class"
                  value={form.className}
                  onChange={(e) => setForm({ ...form, className: e.target.value })}
                >
                  <option value="">Not assigned</option>
                  {CLASSES.map((c) => (
                    <option key={c} value={c}>
                      Class {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="label" htmlFor="pm-section">
                  Section <span className="label-tamil">பிரிவு</span>
                </label>
                <select
                  id="pm-section"
                  value={form.section}
                  onChange={(e) => setForm({ ...form, section: e.target.value })}
                >
                  {SECTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="form-grid-2">
              <div className="field">
                <label className="label" htmlFor="pm-email">
                  Email address
                </label>
                <input
                  id="pm-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="field">
                <label className="label" htmlFor="pm-subject">
                  Subject handled
                </label>
                <select
                  id="pm-subject"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                >
                  <option value="">Not specified</option>
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </>
        )}

        {role === "student" && (
          <div className="field">
            <label className="label" htmlFor="pm-email2">
              Email <span className="label-tamil">(optional — only if the student has one)</span>
            </label>
            <input
              id="pm-email2"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
        )}

        <div className="field">
          <label className="label" htmlFor="pm-password">
            Password {editing && <span className="label-tamil">(leave blank to keep the current one)</span>}
          </label>
          <input
            id="pm-password"
            type="text"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder={editing ? "••••••" : "Leave blank to auto-generate"}
          />
          <div className="hint">At least 6 characters. A password is generated if you leave this blank.</div>
        </div>
      </Modal>

      <Modal
        open={importOpen}
        onClose={() => {
          setImportOpen(false);
          setImportResult(null);
          setImportCsv("");
        }}
        wide
        title={`Import ${copy.plural.toLowerCase()} from CSV`}
        tamil={copy.tamil}
        footer={
          <>
            <button
              className="btn btn-outline"
              onClick={() => {
                setImportOpen(false);
                setImportResult(null);
                setImportCsv("");
              }}
              disabled={importing}
            >
              Close
            </button>
            <button
              className="btn"
              onClick={runImport}
              disabled={importing || !importCsv || Boolean(importResult)}
            >
              {importing ? <span className="spinner spinner-sm" /> : "Start import"}
            </button>
          </>
        }
      >
        {importError && <Alert type="error">{importError}</Alert>}

        {role === "student" ? (
          <>
            <p className="small muted">
              Columns: <code>name</code>, <code>register_no</code>, <code>roll_no</code>, <code>class</code>,{" "}
              <code>section</code>, <code>email</code>, <code>password</code>. Only <code>name</code> and
              <code> register_no</code> are required.
            </p>
            <div className="form-grid-2">
              <div className="field">
                <label className="label" htmlFor="imp-class">
                  Default class (used when the file leaves it blank)
                </label>
                <select
                  id="imp-class"
                  value={importDefaults.className}
                  onChange={(e) => setImportDefaults({ ...importDefaults, className: e.target.value })}
                >
                  <option value="">None</option>
                  {CLASSES.map((c) => (
                    <option key={c} value={c}>
                      Class {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="label" htmlFor="imp-pass">
                  Default password (used when the file leaves it blank)
                </label>
                <input
                  id="imp-pass"
                  value={importDefaults.defaultPassword}
                  onChange={(e) => setImportDefaults({ ...importDefaults, defaultPassword: e.target.value })}
                  placeholder="Auto-generate per student"
                />
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="small muted">
              Columns: <code>name</code>, <code>email</code>, <code>subject</code>, <code>password</code>.
            </p>
            <div className="field">
              <label className="label" htmlFor="imp-pass-t">
                Default password
              </label>
              <input
                id="imp-pass-t"
                value={importDefaults.defaultPassword}
                onChange={(e) => setImportDefaults({ ...importDefaults, defaultPassword: e.target.value })}
                placeholder="Auto-generate per teacher"
              />
            </div>
          </>
        )}

        <CsvUploader
          templateHeaders={templateHeaders}
          templateName={`${role}-roster-template.csv`}
          onParsed={(_, __, meta) => {
            setImportCsv(meta.text);
            setImportResult(null);
          }}
          hint="Download the template first if you are unsure about the column names."
        />

        {importResult && (
          <div className="mt-2">
            <Alert
              type={importResult.summary.failed > 0 ? "warn" : "success"}
              title={`${importResult.summary.created} created, ${importResult.summary.skipped} skipped, ${importResult.summary.failed} problem(s)`}
            >
              {importResult.created.length > 0 && (
                <div className="table-wrap mt-1">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Register no</th>
                        <th>Class</th>
                        <th>Password</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importResult.created.map((c) => (
                        <tr key={c.id}>
                          <td className="cell-primary">{c.name}</td>
                          <td className="mono">{c.registerNo || "—"}</td>
                          <td>{c.classLabel || "—"}</td>
                          <td className="mono">{c.password || "as given in file / default"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Alert>

            {importResult.skipped.length > 0 && (
              <Alert type="info" title="Already registered — left untouched">
                <ul>
                  {importResult.skipped.slice(0, 15).map((s, i) => (
                    <li key={i}>
                      {s.name}: {s.reason}
                    </li>
                  ))}
                </ul>
              </Alert>
            )}

            {importResult.problems.length > 0 && (
              <Alert type="warn" title="Rows that could not be used" items={importResult.problems} />
            )}
          </div>
        )}

        <div className="mt-2">
          <DownloadLink
            href="/api/users/template"
            label={`Download ${copy.singular} CSV template`}
            className="btn btn-quiet btn-sm"
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={remove}
        busy={deleting}
        danger
        title={`Remove ${copy.singular}?`}
        confirmLabel="Remove"
        message={
          <>
            <strong>{confirmDelete?.name}</strong> will lose access to the examination cell. Students
            with submitted papers cannot be deleted — disable them instead so the record is preserved.
            Last updated {confirmDelete ? formatDateTime(confirmDelete.createdAt) : ""}.
          </>
        }
      />
    </>
  );
}
