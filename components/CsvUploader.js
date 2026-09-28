"use client";

import { useRef, useState } from "react";
import { parseCsv, toCsv } from "@/lib/csv";
import { downloadBlob } from "@/lib/format";
import { Alert } from "./Primitives";

export default function CsvUploader({
  templateHeaders,
  templateRows,
  templateName,
  onParsed,
  accept = ".csv,text/csv",
  hint,
  maxBytes = 4 * 1024 * 1024,
}) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");

  function readFile(file) {
    setError("");
    setPreview(null);
    if (!file) return;
    if (file.size > maxBytes) {
      setError("That file is larger than 4 MB. Please split it into smaller files.");
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => setError("Could not read that file.");
    reader.onload = () => {
      const { headers, rows, errors } = parseCsv(String(reader.result || ""));
      if (rows.length === 0) {
        setError(
          errors[0] ||
            "No data rows were found. The first row must contain column headings and at least one record must follow."
        );
        return;
      }
      setPreview({ headers, rows, fileName: file.name });
      onParsed?.(rows, headers, { fileName: file.name, text: String(reader.result || "") });
    };
    reader.readAsText(file);
  }

  function downloadTemplate() {
    const sample = templateRows?.length ? templateRows : [new Array(templateHeaders.length).fill("")];
    downloadBlob(templateName, toCsv(templateHeaders, sample));
  }

  return (
    <div>
      <div
        className={`dropzone ${drag ? "drag" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          readFile(e.dataTransfer.files?.[0]);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
      >
        <div className="dropzone-icon" aria-hidden="true">
          ⬆
        </div>
        <div style={{ fontWeight: 700, marginTop: 6 }}>Choose a CSV file or drag it here</div>
        <div className="hint">
          {hint || `First row must be the column headings. Maximum ${Math.round(maxBytes / 1024 / 1024)} MB.`}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          style={{ display: "none" }}
          onChange={(e) => readFile(e.target.files?.[0])}
        />
      </div>

      <div className="row-wrap mt-2">
        <button type="button" className="btn btn-outline btn-sm" onClick={downloadTemplate}>
          ⬇ Download CSV template
        </button>
        {preview && (
          <span className="small muted">
            <strong>{preview.fileName}</strong> — {preview.rows.length} row
            {preview.rows.length === 1 ? "" : "s"} detected
          </span>
        )}
      </div>

      {error && (
        <div className="mt-2">
          <Alert type="error">{error}</Alert>
        </div>
      )}

      {preview && (
        <div className="csv-table-wrap mt-2">
          <table>
            <thead>
              <tr>
                {preview.headers.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.rows.slice(0, 6).map((row, i) => (
                <tr key={i}>
                  {preview.headers.map((h) => (
                    <td key={h}>{row[h] ?? ""}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
