import Link from "next/link";
import { Camera, Images, ArrowRight, ScanFace, FolderOpen, ImageDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  {
    icon: FolderOpen,
    title: "Upload",
    body: "Drop event photos in bulk. Any size, any count.",
  },
  {
    icon: ScanFace,
    title: "Detect",
    body: "Every face is detected, encoded, and grouped into unique identities automatically.",
  },
  {
    icon: ImageDown,
    title: "Retrieve",
    body: "Take a selfie. Get back every photo you appear in, instantly.",
  },
];

export default function Home() {
  return (
    <div className="animate-fade-in space-y-16 pb-12 pt-6">
      {/* Hero */}
      <section className="mx-auto max-w-xl space-y-6 text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-mutedForeground">
          Face search for events
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Your face is your search query.
        </h1>
        <p className="text-sm leading-relaxed text-mutedForeground sm:text-base">
          Grabpic indexes event photos, groups faces into stable identities,
          and lets you retrieve every photo you appear in with a single selfie.
        </p>
        <div className="flex items-center justify-center gap-3 pt-1">
          <Link href="/find">
            <Button size="lg">
              <Camera className="h-4 w-4" />
              Find my photos
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <Link href="/upload">
            <Button size="lg" variant="secondary">
              <Images className="h-4 w-4" />
              Upload photos
            </Button>
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="space-y-6">
        <h2 className="text-center text-xs font-medium uppercase tracking-widest text-mutedForeground">
          How it works
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {steps.map((s, i) => (
            <div
              key={s.title}
              className="group rounded-xl border border-cardBorder bg-card p-5 transition-colors hover:border-primary/20 hover:bg-card/80"
            >
              <div className="mb-3 flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-mutedForeground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                  <s.icon className="h-4 w-4" />
                </span>
                <span className="text-xs font-medium text-mutedForeground">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                {s.title}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-mutedForeground">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
