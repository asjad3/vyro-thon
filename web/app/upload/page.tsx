"use client";

import * as React from "react";
import { Loader2, Sparkles, Upload as UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PhotoDropzone } from "@/components/photo-dropzone";
import { runIngest, uploadPhotos, type IngestResponse } from "@/lib/api";

export default function UploadPage() {
  const [queued, setQueued] = React.useState<File[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const [ingesting, setIngesting] = React.useState(false);
  const [uploadedCount, setUploadedCount] = React.useState(0);
  const [ingestResult, setIngestResult] = React.useState<IngestResponse | null>(
    null,
  );
  const [error, setError] = React.useState<string | null>(null);

  const addFiles = (files: File[]) => {
    setQueued((q) => [...q, ...files]);
    setError(null);
  };

  const doUpload = async () => {
    if (!queued.length) return;
    setUploading(true);
    setError(null);
    try {
      const res = await uploadPhotos(queued);
      setUploadedCount((c) => c + res.saved.length);
      setQueued([]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const doIngest = async () => {
    setIngesting(true);
    setError(null);
    try {
      const res = await runIngest();
      setIngestResult(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIngesting(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="md:col-span-2 space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Upload event photos
          </h1>
          <p className="mt-1 text-mutedForeground">
            Drop the raw photos, then run ingest to extract faces and assign
            grab_ids.
          </p>
        </div>

        <PhotoDropzone onFiles={addFiles} disabled={uploading || ingesting} />

        {queued.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Queued ({queued.length})</CardTitle>
              <CardDescription>
                These files will be uploaded to the backend&apos;s STORAGE_DIR.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="mb-4 max-h-40 space-y-1 overflow-auto text-sm text-mutedForeground">
                {queued.map((f, i) => (
                  <li key={i} className="truncate">
                    {f.name}{" "}
                    <span className="text-xs">
                      ({Math.round(f.size / 1024)} KB)
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <Button onClick={doUpload} disabled={uploading}>
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UploadIcon className="h-4 w-4" />
                  )}
                  {uploading ? "Uploading..." : "Upload"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setQueued([])}
                  disabled={uploading}
                >
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="border-red-500/30 bg-red-500/5">
            <CardContent>
              <p className="text-sm text-red-400">Error: {error}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Ingest</CardTitle>
            <CardDescription>
              Runs face detection on all images in STORAGE_DIR. Safe to run
              multiple times — already-processed images are skipped.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 text-sm text-mutedForeground">
              Uploaded this session:{" "}
              <span className="font-semibold text-foreground">
                {uploadedCount}
              </span>
            </div>
            <Button
              onClick={doIngest}
              disabled={ingesting}
              className="w-full"
            >
              {ingesting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {ingesting ? "Processing..." : "Run ingest"}
            </Button>
          </CardContent>
        </Card>

        {ingestResult && (
          <Card>
            <CardHeader>
              <CardTitle>Ingest result</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                {Object.entries(ingestResult).map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-mutedForeground">{k}</dt>
                    <dd className="text-xl font-semibold">{v as number}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
