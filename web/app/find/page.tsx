"use client";

import * as React from "react";
import { Loader2, Upload as UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WebcamCapture } from "@/components/webcam-capture";
import { ImageGallery } from "@/components/image-gallery";
import {
  authSelfie,
  fetchGrabImages,
  type AuthResponse,
  type GrabImage,
} from "@/lib/api";
import { cn } from "@/lib/utils";

type Tab = "webcam" | "upload";

export default function FindPage() {
  const [tab, setTab] = React.useState<Tab>("webcam");
  const [busy, setBusy] = React.useState(false);
  const [auth, setAuth] = React.useState<AuthResponse | null>(null);
  const [images, setImages] = React.useState<GrabImage[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const handleBlob = async (blob: Blob) => {
    setBusy(true);
    setError(null);
    setAuth(null);
    setImages([]);
    try {
      const result = await authSelfie(blob);
      setAuth(result);
      const imgs = await fetchGrabImages(result.grab_id);
      setImages(imgs);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleBlob(f);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Find my photos
        </h1>
        <p className="mt-1 text-mutedForeground">
          Take a selfie or upload one. We&apos;ll match it against known
          identities and surface every photo containing you.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Selfie</CardTitle>
            <CardDescription>
              Your face is the search token — nothing is stored except the
              embedding.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 inline-flex rounded-lg border border-white/10 p-1">
              {(["webcam", "upload"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm capitalize",
                    tab === t
                      ? "bg-white/10 text-foreground"
                      : "text-mutedForeground hover:text-foreground",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            {tab === "webcam" ? (
              <WebcamCapture onCapture={handleBlob} disabled={busy} />
            ) : (
              <label
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/10 p-10 text-center hover:border-white/20 hover:bg-white/5",
                  busy && "pointer-events-none opacity-50",
                )}
              >
                <UploadIcon className="mb-3 h-10 w-10 text-mutedForeground" />
                <p className="font-medium">Click to select a selfie</p>
                <p className="mt-1 text-sm text-mutedForeground">
                  JPG, PNG, or WebP
                </p>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={onFileInput}
                />
              </label>
            )}

            {busy && (
              <div className="mt-4 flex items-center gap-2 text-sm text-mutedForeground">
                <Loader2 className="h-4 w-4 animate-spin" /> Matching...
              </div>
            )}
            {error && (
              <p className="mt-4 text-sm text-red-400">{error}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
            <CardDescription>
              {auth
                ? "Matched identity."
                : "Submit a selfie to see your grab_id and photos."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {auth ? (
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-mutedForeground">grab_id</div>
                  <div className="break-all font-mono text-foreground">
                    {auth.grab_id}
                  </div>
                </div>
                <div>
                  <div className="text-mutedForeground">confidence</div>
                  <div className="text-2xl font-semibold">
                    {(auth.confidence * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-mutedForeground">No match yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {auth && (
        <div className="space-y-3">
          <div className="flex items-end justify-between">
            <h2 className="text-xl font-semibold">
              Your photos ({images.length})
            </h2>
            {!!images.length && (
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  setBusy(true);
                  try {
                    setImages(await fetchGrabImages(auth.grab_id));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Refresh
              </Button>
            )}
          </div>
          <ImageGallery images={images} />
        </div>
      )}
    </div>
  );
}
