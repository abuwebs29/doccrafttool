import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FormFlow — Smart scheduled forms",
  description: "Create forms with custom opening and closing dates, times, and timezones."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
