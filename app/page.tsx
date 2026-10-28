"use client";

import { useMemo, useRef, useState } from "react";
import { decimalHours, groupByDay } from "@/lib/group";
import { fmtHms } from "@/lib/toggl";
import type { ParseResult } from "@/lib/types";

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<ParseResult | null>(null);

  const days = useMemo(() => (result ? groupByDay(result.entries) : []), [result]);
  const totalSeconds = days.reduce((s, d) => s + d.totalSeconds, 0);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setResult(null);
    if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") {
      setError("Please upload a PDF file.");
      return;
    }
    setBusy(true);
    setFileName(file.name);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/parse", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong.");
      setResult(json as ParseResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    if (!result) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: result.entries, member: result.member }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not create the file.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("X-Filename") ?? "Timesheet.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the file.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <header>
        <h1>Toggl PDF → Excel</h1>
        <p>
          Upload a Toggl <em>Detailed report</em> PDF and get a daily timesheet: one row per task,
          same-day entries merged, with hours and decimal hours per day.
        </p>
      </header>

      <div
        className={`drop ${dragging ? "drag" : ""}`}
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files[0]);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          hidden
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <strong>{busy && !result ? "Reading PDF…" : "Drop your Toggl PDF here"}</strong>
        <span>{fileName ?? "or click to choose a file"}</span>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {result && result.entries.length > 0 && (
        <section>
          <div className="summary">
            <div>
              <span>Member</span>
              <b>{result.member ?? "—"}</b>
            </div>
            <div>
              <span>Entries</span>
              <b>{result.entries.length}</b>
            </div>
            <div>
              <span>Days</span>
              <b>{days.length}</b>
            </div>
            <div>
              <span>Total</span>
              <b>
                {fmtHms(totalSeconds)} · {decimalHours(totalSeconds).toFixed(4)}
              </b>
            </div>
          </div>

          {result.warnings.map((w) => (
            <p key={w} className="warn">
              {w}
            </p>
          ))}
          {result.warnings.length === 0 && result.reportedTotalSeconds !== null && (
            <p className="ok">✓ Total matches the report ({fmtHms(result.reportedTotalSeconds)}).</p>
          )}

          <div className="actions">
            <button onClick={download} disabled={busy}>
              {busy ? "Preparing…" : "Download Excel"}
            </button>
          </div>

          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Tasks</th>
                  <th>Duration</th>
                  <th>Hours</th>
                  <th>Decimal Hours</th>
                </tr>
              </thead>
              <tbody>
                {days.map((day) =>
                  day.tasks.map((t, i) => (
                    <tr key={`${day.date}-${i}`} className={i === 0 ? "first" : ""}>
                      {i === 0 && (
                        <td rowSpan={day.tasks.length} className="merged">
                          {fmtDate(day.date)}
                        </td>
                      )}
                      <td>{t.description}</td>
                      <td className="num">{fmtHms(t.durationSeconds)}</td>
                      {i === 0 && (
                        <>
                          <td rowSpan={day.tasks.length} className="merged num">
                            {fmtHms(day.totalSeconds)}
                          </td>
                          <td rowSpan={day.tasks.length} className="merged num">
                            {decimalHours(day.totalSeconds).toFixed(4)}
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} />
                  <td className="num">TOTAL:</td>
                  <td className="num">{fmtHms(totalSeconds)}</td>
                  <td className="num">{decimalHours(totalSeconds).toFixed(4)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
