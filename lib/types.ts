/** One raw time entry from the Toggl detailed report. */
export interface TogglEntry {
  /** ISO date, e.g. "2026-10-27" */
  date: string;
  /** Start time as printed in the report, e.g. "8:11 AM" */
  start: string;
  description: string;
  durationSeconds: number;
}

export interface ParseResult {
  entries: TogglEntry[];
  member: string | null;
  /** "Total Hours" shown in the report's summary box, in seconds */
  reportedTotalSeconds: number | null;
  warnings: string[];
}

/** A task line inside a day (same-named entries on one day are merged). */
export interface TaskRow {
  description: string;
  durationSeconds: number;
}

export interface DayGroup {
  date: string;
  tasks: TaskRow[];
  totalSeconds: number;
}
