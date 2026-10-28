import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Toggl PDF to Excel",
  description: "Convert a Toggl detailed report PDF into a daily timesheet spreadsheet.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
