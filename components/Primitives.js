export function Alert({ type = "info", title, children, items }) {
  const icon = { error: "⚠", success: "✔", warn: "!", info: "i" }[type] || "i";
  return (
    <div className={`alert alert-${type}`} role={type === "error" ? "alert" : "status"}>
      <span className="alert-icon" aria-hidden="true">
        {icon}
      </span>
      <div className="grow">
        {title && <strong>{title}</strong>}
        {children}
        {items && items.length > 0 && (
          <ul className="alert-list">
            {items.slice(0, 40).map((item, i) => (
              <li key={i}>{item}</li>
            ))}
            {items.length > 40 && <li className="muted">…and {items.length - 40} more problems.</li>}
          </ul>
        )}
      </div>
    </div>
  );
}

export function EmptyState({ icon = "📄", title, children, action }) {
  return (
    <div className="empty">
      <div className="empty-icon" aria-hidden="true">
        {icon}
      </div>
      {title && <div className="empty-title">{title}</div>}
      {children && <div className="small">{children}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Loading({ label = "Loading…", small = false }) {
  return (
    <div className="loading-block" style={small ? { padding: "20px" } : undefined}>
      <span className={small ? "spinner spinner-sm" : "spinner"} />
      <span className="small">{label}</span>
    </div>
  );
}

export function StatCard({ label, value, meta, tone = "red", tamil, icon }) {
  return (
    <div className={`stat stat-${tone}`}>
      <div className="stat-label">
        {icon && <span aria-hidden="true">{icon}</span>}
        {label}
        {tamil && <span className="tamil" style={{ fontWeight: 500, letterSpacing: 0 }}>{tamil}</span>}
      </div>
      <div className="stat-value">{value}</div>
      {meta && <div className="stat-meta">{meta}</div>}
    </div>
  );
}

export function Meter({ value, max = 100, tone }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className="meter" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`meter-fill ${tone || ""}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Badge({ tone = "grey", children, live = false }) {
  return (
    <span className={`badge badge-${tone} ${live ? "badge-live" : ""}`}>
      {live && <span className="dot" aria-hidden="true" />}
      {children}
    </span>
  );
}

export function Switch({ checked, onChange, label, hint, id }) {
  return (
    <div className="mb-1">
      <label className="row" style={{ gap: 11, cursor: "pointer" }} htmlFor={id}>
        <span className="switch">
          <input
            id={id}
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span className="switch-track" />
        </span>
        <span>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{label}</span>
          {hint && <span className="hint" style={{ display: "block" }}>{hint}</span>}
        </span>
      </label>
    </div>
  );
}
