import { NextResponse } from "next/server";
import { parseTogglPdf } from "@/lib/pdf";

export const runtime = "nodejs";

const MAX_BYTES = 15 * 1024 * 1024;

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File is too large (max 15 MB)." }, { status: 413 });
  }

  try {
    const data = new Uint8Array(await file.arrayBuffer());
    // Cheap sanity check for the PDF magic number.
    if (String.fromCharCode(...data.slice(0, 5)) !== "%PDF-") {
      return NextResponse.json({ error: "That doesn't look like a PDF file." }, { status: 400 });
    }
    const result = await parseTogglPdf(data);
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not read this PDF." }, { status: 422 });
  }
}
