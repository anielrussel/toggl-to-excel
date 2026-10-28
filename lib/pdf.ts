import { extractText, getDocumentProxy } from "unpdf";
import { parseTogglPages } from "./toggl";
import type { ParseResult } from "./types";

/** Extract per-page text from a PDF buffer and parse it as a Toggl detailed report. */
export async function parseTogglPdf(data: Uint8Array): Promise<ParseResult> {
  const pdf = await getDocumentProxy(data);
  const { text } = await extractText(pdf, { mergePages: false });
  return parseTogglPages(text);
}
