import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Grabpic — Find your photos",
  description: "Selfie-as-a-Key photo retrieval for events.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <header className="border-b border-white/10">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              Grabpic
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link
                href="/upload"
                className="rounded-md px-3 py-1.5 text-mutedForeground hover:bg-white/5 hover:text-foreground"
              >
                Upload
              </Link>
              <Link
                href="/find"
                className="rounded-md px-3 py-1.5 text-mutedForeground hover:bg-white/5 hover:text-foreground"
              >
                Find my photos
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
