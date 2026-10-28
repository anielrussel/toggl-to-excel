import type { DayGroup, TogglEntry } from "./types";

const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

function startMinutes(start: string): number {
  const m = start.match(/(\d{1,2}):(\d{2})\s?([AP])M/i);
  if (!m) return 0;
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === "P") h += 12;
  return h * 60 + Number(m[2]);
}

/**
 * Group entries by day (oldest first). Within a day, entries with the same description are
 * merged into one task row, ordered by when each task was first started.
 */
export function groupByDay(entries: TogglEntry[]): DayGroup[] {
  const sorted = [...entries].sort(
    (a, b) => a.date.localeCompare(b.date) || startMinutes(a.start) - startMinutes(b.start)
  );

  const days: DayGroup[] = [];
  const index = new Map<string, DayGroup>();
  const taskIndex = new Map<string, number>();

  for (const e of sorted) {
    let day = index.get(e.date);
    if (!day) {
      day = { date: e.date, tasks: [], totalSeconds: 0 };
      index.set(e.date, day);
      days.push(day);
    }
    const key = `${e.date}|${norm(e.description)}`;
    const at = taskIndex.get(key);
    if (at === undefined) {
      taskIndex.set(key, day.tasks.length);
      day.tasks.push({ description: e.description, durationSeconds: e.durationSeconds });
    } else {
      day.tasks[at].durationSeconds += e.durationSeconds;
    }
    day.totalSeconds += e.durationSeconds;
  }
  return days;
}

export const decimalHours = (seconds: number) => Math.round((seconds / 3600) * 10000) / 10000;
