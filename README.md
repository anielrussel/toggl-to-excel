# Toggl PDF → Excel

Next.js 16 app that converts a Toggl **Detailed report** PDF into a daily timesheet `.xlsx`.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
```

Upload the PDF, check the preview, click **Download Excel**.

## Output format (matches `Timesheet-<Name>-<MonYYYY>.xlsx`)

| Date | Tasks | Duration | Hours | Decimal Hours |
|------|-------|----------|-------|---------------|

- One row per task per day; entries with the same description on the same day are merged.
- Days are sorted oldest first; tasks are ordered by when they were first started that day.
- Date, Hours (day total) and Decimal Hours are merged across that day's rows.
- A `TOTAL:` row closes the sheet.
- The parsed total is checked against the report's own "Total Hours"; a warning shows on mismatch.

## Structure

- `lib/toggl.ts` – parses the text extracted from the PDF into entries
- `lib/group.ts` – groups/merges entries per day
- `lib/excel.ts` – builds the workbook (ExcelJS)
- `lib/pdf.ts` – PDF text extraction (unpdf)
- `app/api/parse`, `app/api/excel` – route handlers
- `app/page.tsx` – upload + preview UI
- `npm run test:parse` – runs the parser against `scripts/sample.pdf` (not included in the zip)
