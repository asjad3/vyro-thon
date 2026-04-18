const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

export type GrabImage = { id: string; path: string; url: string };
export type AuthResponse = { grab_id: string; confidence: number };
export type IngestResponse = {
  processed: number;
  skipped: number;
  faces_detected: number;
  grab_ids_created: number;
};
export type UploadResponse = {
  saved: { filename: string; path: string; bytes: number }[];
};

async function parseError(res: Response): Promise<string> {
  try {
    const j = await res.json();
    return j?.error?.message || j?.detail || res.statusText;
  } catch {
    return res.statusText;
  }
}

export async function uploadPhotos(files: File[]): Promise<UploadResponse> {
  const fd = new FormData();
  for (const f of files) fd.append("files", f);
  const res = await fetch(`${API_URL}/upload`, { method: "POST", body: fd });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function runIngest(): Promise<IngestResponse> {
  const res = await fetch(`${API_URL}/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function authSelfie(file: Blob): Promise<AuthResponse> {
  const fd = new FormData();
  fd.append("file", file, "selfie.jpg");
  const res = await fetch(`${API_URL}/auth/selfie`, {
    method: "POST",
    body: fd,
  });
  if (res.status === 401) throw new Error("No matching identity found");
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function fetchGrabImages(grabId: string): Promise<GrabImage[]> {
  const res = await fetch(`${API_URL}/grabs/${grabId}/images`);
  if (!res.ok) throw new Error(await parseError(res));
  const data = await res.json();
  return data.images as GrabImage[];
}

export function fileUrl(imageId: string): string {
  return `${API_URL}/files/${imageId}`;
}
