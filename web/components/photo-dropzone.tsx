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
        "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-colors",
        isDragActive
          ? "border-primary bg-primary/5"
          : "border-white/10 hover:border-white/20 hover:bg-white/5",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <input {...getInputProps()} />
      <UploadCloud className="mb-3 h-10 w-10 text-mutedForeground" />
      <p className="font-medium">
        {isDragActive ? "Drop photos here" : "Drag & drop photos, or click to browse"}
      </p>
      <p className="mt-1 text-sm text-mutedForeground">
        JPG, PNG, or WebP. Multiple files supported.
      </p>
    </div>
  );
}
