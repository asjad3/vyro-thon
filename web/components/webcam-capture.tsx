"use client";

import * as React from "react";
import { Camera, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  onCapture: (blob: Blob) => void;
  disabled?: boolean;
};

export function WebcamCapture({ onCapture, disabled }: Props) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [streaming, setStreaming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const start = React.useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStreaming(true);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  const stop = React.useCallback(() => {
    const video = videoRef.current;
    if (video?.srcObject) {
      (video.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    }
    setStreaming(false);
  }, []);

  React.useEffect(() => () => stop(), [stop]);

  const snap = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(blob);
      },
      "image/jpeg",
      0.92,
    );
  };

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-cardBorder bg-black">
        <video
          ref={videoRef}
          playsInline
          muted
          className="h-full w-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />
        {!streaming && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-mutedForeground">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50">
              <Camera className="h-5 w-5" />
            </div>
            <p className="text-xs">Camera off</p>
          </div>
        )}
        {streaming && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
            <Button size="sm" onClick={snap} disabled={disabled}>
              <Camera className="h-3.5 w-3.5" /> Capture
            </Button>
            <Button size="sm" variant="secondary" onClick={stop} disabled={disabled}>
              <Square className="h-3 w-3" /> Stop
            </Button>
          </div>
        )}
      </div>
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}
      {!streaming && (
        <Button onClick={start} disabled={disabled}>
          <Camera className="h-3.5 w-3.5" /> Start camera
        </Button>
      )}
    </div>
  );
}
