import Link from "next/link";
import { Camera, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col items-center gap-16 pt-10 text-center">
      <div className="max-w-2xl space-y-5">
        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-mutedForeground">
          Intelligent Identity &amp; Retrieval Engine
        </span>
        <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
          Find yourself in the crowd.
        </h1>
        <p className="text-lg text-mutedForeground">
          Upload thousands of event photos. Take a selfie. Grabpic groups faces
          automatically and returns every photo that&apos;s yours.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link href="/find">
            <Button size="lg">
              <Camera className="h-4 w-4" /> Find my photos
            </Button>
          </Link>
          <Link href="/upload">
            <Button size="lg" variant="secondary">
              <Upload className="h-4 w-4" /> Upload event photos
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid w-full gap-4 md:grid-cols-3">
        {[
          {
            title: "1. Ingest",
            body: "Drop a batch of event photos. We detect every face and assign stable grab_ids.",
          },
          {
            title: "2. Authenticate",
            body: "A single selfie is your search token — matched via ArcFace embeddings on pgvector.",
          },
          {
            title: "3. Retrieve",
            body: "Browse every photo containing your identity. One image, many people, zero manual tagging.",
          },
        ].map((f) => (
          <div
            key={f.title}
            className="rounded-xl border border-white/10 bg-card p-6 text-left"
          >
            <h3 className="font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-mutedForeground">{f.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
