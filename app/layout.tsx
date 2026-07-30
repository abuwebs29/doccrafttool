import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://doccrafttools.com"),
  title: {
    default: "DocCraft Studio — Free Business Writing Generators",
    template: "%s | DocCraft Studio"
  },
  description: "Create professional business emails, customer replies, sales follow-ups and workplace wording in your browser.",
  alternates: { canonical: "/" }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <a className="brand" href="/">DocCraft Studio</a>
          <nav><a href="/#generators">Generators</a><a href="/#privacy">Privacy</a></nav>
        </header>
        {children}
        <footer>© {new Date().getFullYear()} DocCraft Studio. Your text stays in your browser.</footer>
      </body>
    </html>
  );
}
