"use client";

import * as React from "react";
import { Camera, RefreshCw } from "lucide-react";
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
    <div className="space-y-4">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-black">
        <video
          ref={videoRef}
          playsInline
          muted
          className="h-full w-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />
        {!streaming && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-mutedForeground">
            <Camera className="h-10 w-10" />
            <p>Camera off</p>
          </div>
        )}
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-2">
        {!streaming ? (
          <Button onClick={start} disabled={disabled}>
            <Camera className="h-4 w-4" /> Start camera
          </Button>
        ) : (
          <>
            <Button onClick={snap} disabled={disabled}>
              <Camera className="h-4 w-4" /> Capture & find
            </Button>
            <Button variant="secondary" onClick={stop} disabled={disabled}>
              <RefreshCw className="h-4 w-4" /> Stop
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
