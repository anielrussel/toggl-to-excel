import { NextResponse } from "next/server";
import { buildTimesheetXlsx, timesheetFilename } from "@/lib/excel";
import type { TogglEntry } from "@/lib/types";

export const runtime = "nodejs";

function isEntry(e: unknown): e is TogglEntry {
  const x = e as TogglEntry;
  return (
    !!x &&
    typeof x.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(x.date) &&
    typeof x.start === "string" &&
    typeof x.description === "string" &&
    Number.isFinite(x.durationSeconds) &&
    x.durationSeconds >= 0
  );
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const entries: unknown = body?.entries;

  if (!Array.isArray(entries) || entries.length === 0 || !entries.every(isEntry)) {
    return NextResponse.json({ error: "Invalid or empty entries." }, { status: 400 });
  }

  const member = typeof body.member === "string" ? body.member : null;
  const buffer = await buildTimesheetXlsx(entries);
  const filename = timesheetFilename(member, entries);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Filename": filename,
      "Access-Control-Expose-Headers": "X-Filename, Content-Disposition",
    },
  });
}
