import { readFileSync, writeFileSync } from "node:fs";
import { parseTogglPdf } from "../lib/pdf";
import { buildTimesheetXlsx, timesheetFilename } from "../lib/excel";
import { groupByDay } from "../lib/group";
import { fmtHms } from "../lib/toggl";

const result = await parseTogglPdf(new Uint8Array(readFileSync("scripts/sample.pdf")));
const total = result.entries.reduce((s, e) => s + e.durationSeconds, 0);

console.log("member:", result.member);
console.log("entries:", result.entries.length);
console.log("parsed total:", fmtHms(total), "| report total:", fmtHms(result.reportedTotalSeconds ?? 0));
console.log("warnings:", result.warnings);

const days = groupByDay(result.entries);
console.log("days:", days.length);
for (const d of days) {
  console.log(d.date, fmtHms(d.totalSeconds));
  for (const t of d.tasks) console.log("   ", fmtHms(t.durationSeconds), t.description);
}

const buf = await buildTimesheetXlsx(result.entries);
const name = timesheetFilename(result.member, result.entries);
writeFileSync(`scripts/${name}`, buf);
console.log("wrote scripts/" + name, buf.length, "bytes");
