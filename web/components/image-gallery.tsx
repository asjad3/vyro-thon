"use client";

import * as React from "react";
import { X } from "lucide-react";
import type { GrabImage } from "@/lib/api";

export function ImageGallery({ images }: { images: GrabImage[] }) {
  const [active, setActive] = React.useState<GrabImage | null>(null);

  if (!images.length) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 p-10 text-center text-mutedForeground">
        No images yet.
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {images.map((img) => (
          <button
            key={img.id}
            onClick={() => setActive(img)}
            className="group relative aspect-square overflow-hidden rounded-lg border border-white/10 bg-card transition-transform hover:-translate-y-0.5 hover:border-white/20"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      {active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setActive(null)}
        >
          <button
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              setActive(null);
            }}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={active.url}
            alt=""
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
