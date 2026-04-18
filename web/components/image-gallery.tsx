"use client";

import * as React from "react";
import { X, ImageOff } from "lucide-react";
import type { GrabImage } from "@/lib/api";

export function ImageGallery({ images }: { images: GrabImage[] }) {
  const [active, setActive] = React.useState<GrabImage | null>(null);

  if (!images.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-cardBorder bg-surface py-10 text-center">
        <ImageOff className="mb-2 h-5 w-5 text-mutedForeground" />
        <p className="text-xs text-mutedForeground">No images yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {images.map((img) => (
          <button
            key={img.id}
            onClick={() => setActive(img)}
            className="group relative aspect-square overflow-hidden rounded-lg border border-cardBorder bg-surface transition-all hover:border-primary/20 hover:shadow-glow"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
            />
          </button>
        ))}
      </div>

      {active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-4 backdrop-blur-sm"
          onClick={() => setActive(null)}
        >
          <button
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-cardBorder bg-card transition-colors hover:bg-muted"
            onClick={(e) => {
              e.stopPropagation();
              setActive(null);
            }}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={active.url}
            alt=""
            className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
