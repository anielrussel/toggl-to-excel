import type { ParseResult, TogglEntry } from "./types";

const HEADER_MARK = /DESCRIPTION\s+DURATION\s+MEMBER\s+PROJECT\s+TAGS\s+TIME\s*\|\s*DATE/;

/**
 * One entry = duration, "member • project", tags dash, "start - end", date.
 * Everything before the duration (since the previous entry) is the description.
 * The middle part is matched loosely so a different member/project/bullet glyph still works.
 */
const ENTRY_RE =
  /([\s\S]*?)(\d+:\d{2}:\d{2})[ \t]+[^\n]*?[ \t]+-[ \t]+(\d{1,2}:\d{2}\s?[AP]M)[ \t]+-[ \t]+(\d{1,2}:\d{2}\s?[AP]M)\s*(\d{2}\/\d{2}\/\d{4})/g;

export function hmsToSeconds(hms: string): number {
  const [h, m, s] = hms.split(":").map(Number);
  return h * 3600 + m * 60 + s;
}

/** Remove page chrome (logo, footer, repeated table header) and the summary box. */
function cleanPage(page: string): string {
  const lines = page.split(/\r?\n/).map((l) => l.trim());
  const headerIdx = lines.findIndex((l) => HEADER_MARK.test(l));
  const body = headerIdx >= 0 ? lines.slice(headerIdx + 1) : lines;
  return body
    .filter(
      (l) =>
        l &&
        !/^made with\s+toggl$/i.test(l) &&
        !/^time entries from this month$/i.test(l) &&
        !/\bPage\s+\d+\s*\/\s*\d+$/.test(l)
    )
    .join("\n");
}

/**
 * Toggl wraps long descriptions across lines. Join them with spaces, except when a single
 * very long word was force-broken mid-word (e.g. "Application/Admissio" + "n").
 */
function joinDescription(raw: string): string {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  let out = "";
  for (const line of lines) {
    if (!out) {
      out = line;
      continue;
    }
    const lastToken = out.split(" ").pop() ?? "";
    const brokenWord = lastToken.length >= 18 && /^\S{1,3}$/.test(line);
    out += (brokenWord ? "" : " ") + line;
  }
  return out.replace(/\s+/g, " ").trim();
}

function toIsoDate(mdy: string): string {
  const [mm, dd, yyyy] = mdy.split("/");
  return `${yyyy}-${mm}-${dd}`;
}

export function parseTogglPages(pages: string[]): ParseResult {
  const warnings: string[] = [];
  const full = pages.join("\n");

  const totalMatch = full.match(/Total Hours\s+(\d+:\d{2}:\d{2})/);
  const reportedTotalSeconds = totalMatch ? hmsToSeconds(totalMatch[1]) : null;
  const memberMatch = full.match(/Member is\s+([^\n]+)/);
  const member = memberMatch ? memberMatch[1].trim() : null;

  const body = pages.map(cleanPage).join("\n");
  const entries: TogglEntry[] = [];

  for (const m of body.matchAll(ENTRY_RE)) {
    const [, rawDesc, duration, start, , date] = m;
    const description = joinDescription(rawDesc);
    if (!description) warnings.push(`An entry on ${date} (${start}) has no description.`);
    entries.push({
      date: toIsoDate(date),
      start: start.replace(/\s?([AP]M)/, " $1"),
      description,
      durationSeconds: hmsToSeconds(duration),
    });
  }

  if (entries.length === 0) {
    warnings.push("No time entries were found. Is this a Toggl 'Detailed report' PDF?");
  }

  const parsedTotal = entries.reduce((s, e) => s + e.durationSeconds, 0);
  if (reportedTotalSeconds !== null && parsedTotal !== reportedTotalSeconds) {
    warnings.push(
      `Parsed total (${fmtHms(parsedTotal)}) does not match the report's total (${fmtHms(
        reportedTotalSeconds
      )}). Some entries may have been missed.`
    );
  }

  return { entries, member, reportedTotalSeconds, warnings };
}

export function fmtHms(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
