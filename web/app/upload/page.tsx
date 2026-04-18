"use client";

import * as React from "react";
import {
  UploadCloud,
  Inbox,
  Loader2,
  CheckCircle2,
  FileImage,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { PhotoDropzone } from "@/components/photo-dropzone";
import { uploadPhotos, runIngest, type IngestResponse } from "@/lib/api";

export default function UploadPage() {
  const [queue, setQueue] = React.useState<File[]>([]);
  const [uploaded, setUploaded] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [ingestResult, setIngestResult] =
    React.useState<IngestResponse | null>(null);

  const handleUpload = async () => {
    if (!queue.length) return;
    setBusy(true);
    setError(null);
    try {
      const res = await uploadPhotos(queue);
      setUploaded(res.saved.length);
      setQueue([]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleIngest = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await runIngest();
      setIngestResult(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Page header */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Upload event photos
        </h1>
        <p className="text-sm text-mutedForeground">
          Drop photos from an event. After uploading, run ingest to detect and
          index all faces.
        </p>
      </div>

      {/* Upload card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UploadCloud className="h-4 w-4 text-primary" />
            Photos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <PhotoDropzone
            onFiles={(f) => setQueue((q) => [...q, ...f])}
            disabled={busy}
          />

          {!!queue.length && (
            <div className="flex items-center gap-2 text-xs text-mutedForeground">
              <FileImage className="h-3.5 w-3.5" />
              <span>
                <span className="font-medium text-foreground">
                  {queue.length}
                </span>{" "}
                file(s) queued
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button onClick={handleUpload} disabled={busy || !queue.length}>
              {busy ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
                </>
              ) : (
                <>
                  <UploadCloud className="h-3.5 w-3.5" /> Upload
                </>
              )}
            </Button>
            {uploaded > 0 && (
              <Button
                variant="secondary"
                onClick={handleIngest}
                disabled={busy}
              >
                <Inbox className="h-3.5 w-3.5" /> Run ingest
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Feedback */}
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {uploaded > 0 && !ingestResult && (
        <div className="flex items-center gap-2 text-xs text-accent">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {uploaded} file(s) uploaded. Click &quot;Run ingest&quot; to detect faces.
        </div>
      )}

      {/* Ingest results */}
      {ingestResult && (
        <Card>
          <CardHeader>
            <CardTitle>Ingest results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {(
                [
                  ["Processed", ingestResult.processed],
                  ["Skipped", ingestResult.skipped],
                  ["Faces detected", ingestResult.faces_detected],
                  ["Identities", ingestResult.grab_ids_created],
                ] as const
              ).map(([label, val]) => (
                <div key={label} className="space-y-0.5">
                  <p className="text-[10px] uppercase tracking-wider text-mutedForeground">
                    {label}
                  </p>
                  <p className="text-lg font-semibold tabular-nums text-foreground">
                    {val}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
