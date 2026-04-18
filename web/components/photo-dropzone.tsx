"use client";

import * as React from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
};

export function PhotoDropzone({ onFiles, disabled }: Props) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    disabled,
    onDrop: (accepted) => {
      if (accepted.length) onFiles(accepted);
    },
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center transition-colors",
        isDragActive
          ? "border-primary bg-primary/5"
          : "border-cardBorder bg-surface hover:border-primary/30 hover:bg-muted/50",
        disabled && "pointer-events-none opacity-40",
      )}
    >
      <input {...getInputProps()} />
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <UploadCloud className="h-4 w-4 text-mutedForeground" />
      </div>
      <p className="text-sm font-medium text-foreground">
        {isDragActive ? "Drop photos here" : "Drag & drop photos, or click to browse"}
      </p>
      <p className="mt-1 text-xs text-mutedForeground">
        JPG, PNG, or WebP. Multiple files supported.
      </p>
    </div>
  );
}
