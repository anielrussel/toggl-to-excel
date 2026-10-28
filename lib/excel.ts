import ExcelJS from "exceljs";
import { decimalHours, groupByDay } from "./group";
import type { TogglEntry } from "./types";

const DAY = 86400;
const thin: Partial<ExcelJS.Border> = { style: "thin" };
const allThin: Partial<ExcelJS.Borders> = { top: thin, left: thin, bottom: thin, right: thin };

function isoToUtcDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Build a timesheet workbook that mirrors the Timesheet-<name>-<MonYYYY>.xlsx template. */
export async function buildTimesheetXlsx(entries: TogglEntry[]): Promise<Buffer> {
  const days = groupByDay(entries);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Sheet1");
  ws.columns = [
    { key: "date", width: 16 },
    { key: "task", width: 58 },
    { key: "duration", width: 14 },
    { key: "hours", width: 12 },
    { key: "decimal", width: 15 },
  ];

  const header = ws.addRow(["Date", "Tasks", "Duration", "Hours", "Decimal Hours"]);
  header.font = { name: "Calibri", size: 11, bold: true };
  header.alignment = { vertical: "middle" };

  let totalSeconds = 0;

  for (const day of days) {
    const first = ws.rowCount + 1;
    day.tasks.forEach((task, i) => {
      const row = ws.addRow([
        i === 0 ? isoToUtcDate(day.date) : null,
        task.description,
        task.durationSeconds / DAY,
        i === 0 ? day.totalSeconds / DAY : null,
        i === 0 ? decimalHours(day.totalSeconds) : null,
      ]);
      row.font = { name: "Calibri", size: 11 };
      for (let c = 1; c <= 5; c++) row.getCell(c).border = allThin;
      row.getCell(1).numFmt = "d-mmm-yy";
      row.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
      row.getCell(2).alignment = { wrapText: true, vertical: "top" };
      row.getCell(3).numFmt = "h:mm:ss";
      row.getCell(3).alignment = { vertical: "top" };
      row.getCell(4).numFmt = "h:mm:ss";
      row.getCell(4).alignment = { horizontal: "right", vertical: "middle" };
      row.getCell(5).numFmt = "0.0000";
      row.getCell(5).alignment = { horizontal: "right", vertical: "middle" };
    });
    const last = ws.rowCount;
    if (last > first) {
      for (const col of ["A", "D", "E"]) ws.mergeCells(`${col}${first}:${col}${last}`);
    }
    totalSeconds += day.totalSeconds;
  }

  const medium: Partial<ExcelJS.Border> = { style: "medium" };
  const total = ws.addRow([null, null, "TOTAL: ", totalSeconds / DAY, decimalHours(totalSeconds)]);
  total.font = { name: "Calibri", size: 11, bold: true };
  for (let c = 1; c <= 5; c++) total.getCell(c).border = { top: medium, bottom: medium };
  total.getCell(3).alignment = { horizontal: "right" };
  total.getCell(4).numFmt = "[h]:mm:ss";
  total.getCell(4).alignment = { horizontal: "right" };
  total.getCell(5).numFmt = "0.0000";
  total.getCell(5).alignment = { horizontal: "right" };

  return Buffer.from(await wb.xlsx.writeBuffer());
}

/** "Timesheet-Russel-Oct2026.xlsx" from the member's first name and the earliest entry date. */
export function timesheetFilename(member: string | null, entries: TogglEntry[]): string {
  const first = member?.trim().split(/\s+/)[0]?.replace(/[^\w-]/g, "") || "Timesheet";
  const dates = entries.map((e) => e.date).sort();
  let when = "";
  if (dates.length) {
    const d = isoToUtcDate(dates[0]);
    const mon = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
    when = `-${mon}${d.getUTCFullYear()}`;
  }
  return `Timesheet-${first}${when}.xlsx`;
}
