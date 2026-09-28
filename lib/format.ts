// @ts-nocheck
const TZ = "Asia/Kolkata";

const DATE_OPTS = {
  timeZone: TZ,
  day: "2-digit",
  month: "short",
  year: "numeric",
};

const TIME_OPTS = { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: true };
const DATETIME_OPTS = { ...DATE_OPTS, ...TIME_OPTS };

export function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", DATE_OPTS);
}

export function formatTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-IN", TIME_OPTS);
}

export function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString("en-IN", DATETIME_OPTS)} ${d.toLocaleTimeString("en-IN", TIME_OPTS)}`;
}

export function toLocalInputValue(value) {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

export function formatSeconds(totalSeconds) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  return `${minutes}:${pad(seconds)}`;
}

export function pluralise(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural || `${singular}s`}`;
}

export function percent(value, digits = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0%";
  return `${n.toFixed(digits).replace(/\.0+$/, "")}%`;
}

export function initials(name) {
  return String(name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

export function classLabel(classroom) {
  if (!classroom) return "—";
  const name = classroom.name ?? "";
  const section = classroom.section ?? "";
  return section ? `${name}-${section}` : name;
}

export function marksLabel(marks) {
  return `${marks} ${Number(marks) === 1 ? "mark" : "marks"}`;
}

export function downloadBlob(filename, content, mime = "text/csv;charset=utf-8") {
  if (typeof window === "undefined") return;
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
