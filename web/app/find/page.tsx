"use client";

import * as React from "react";
import {
  Camera,
  Upload,
  ImageIcon,
  Loader2,
  ScanFace,
  CheckCircle2,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { WebcamCapture } from "@/components/webcam-capture";
import { ImageGallery } from "@/components/image-gallery";
import {
  authSelfie,
  fetchGrabImages,
  type GrabImage,
  type AuthResponse,
} from "@/lib/api";

export default function FindPage() {
  const [mode, setMode] = React.useState<"cam" | "upload">("cam");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [auth, setAuth] = React.useState<AuthResponse | null>(null);
  const [images, setImages] = React.useState<GrabImage[]>([]);

  const handleBlob = async (blob: Blob) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authSelfie(blob);
      setAuth(res);
      const imgs = await fetchGrabImages(res.grab_id);
      setImages(imgs);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleBlob(file);
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Page header */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Find my photos
        </h1>
        <p className="text-sm text-mutedForeground">
          Use your camera or upload a selfie to search all indexed event photos.
        </p>
      </div>

      {/* Input card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ScanFace className="h-4 w-4 text-primary" />
              Face search
            </CardTitle>
            <div className="flex rounded-lg border border-cardBorder p-0.5">
              <button
                onClick={() => setMode("cam")}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  mode === "cam"
                    ? "bg-muted text-foreground"
                    : "text-mutedForeground hover:text-foreground"
                }`}
              >
                <Camera className="h-3 w-3" />
                Camera
              </button>
              <button
                onClick={() => setMode("upload")}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  mode === "upload"
                    ? "bg-muted text-foreground"
                    : "text-mutedForeground hover:text-foreground"
                }`}
              >
                <Upload className="h-3 w-3" />
                Upload
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {mode === "cam" ? (
            <WebcamCapture onCapture={handleBlob} disabled={loading} />
          ) : (
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-cardBorder bg-surface p-10 text-center transition-colors hover:border-primary/30 hover:bg-muted/50">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Upload className="h-4 w-4 text-mutedForeground" />
              </div>
              <span className="text-sm font-medium text-foreground">
                Click to select a selfie
              </span>
              <span className="mt-1 text-xs text-mutedForeground">
                JPG, PNG, or WebP
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFile}
                disabled={loading}
              />
            </label>
          )}

          {loading && (
            <div className="mt-4 flex items-center gap-2 text-xs text-mutedForeground">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              Searching for your face…
            </div>
          )}
          {error && (
            <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {auth && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" />
                Results
              </CardTitle>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-xs text-accent">
                  <CheckCircle2 className="h-3 w-3" />
                  {(auth.confidence * 100).toFixed(1)}% match
                </span>
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-mutedForeground">
                  {auth.grab_id}
                </code>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ImageGallery images={images} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
