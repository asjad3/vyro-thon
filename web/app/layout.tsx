import type { Metadata } from "next";
import Link from "next/link";
import { Camera, Images } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Grabpic",
  description: "Find every photo you appear in — selfie-powered face search for events.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background font-sans text-foreground">
        <header className="sticky top-0 z-40 border-b border-cardBorder bg-background/80 backdrop-blur-lg">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white">
                G
              </span>
              grabpic
            </Link>
            <nav className="flex items-center gap-0.5">
              <Link
                href="/upload"
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-mutedForeground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Images className="h-3.5 w-3.5" />
                Upload
              </Link>
              <Link
                href="/find"
                className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
              >
                <Camera className="h-3.5 w-3.5" />
                Find Photos
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          {children}
        </main>
      </body>
    </html>
  );
}
