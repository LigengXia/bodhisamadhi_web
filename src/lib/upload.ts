// Client-side helper for the admin media uploads (Phase 7 PDF, Phase 8 audio).
// The file is PUT straight to R2 with a signed URL; only the object key is
// submitted with the form.

export type UploadKind = 'script' | 'audio';

export async function getSignedUpload(
  kind: UploadKind,
  file: File,
): Promise<
  | { ok: true; uploadUrl: string; key: string }
  | { ok: false; reason: 'unconfigured' | 'failed' }
> {
  try {
    const res = await fetch('/api/admin/upload-url', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        kind,
        contentType: file.type,
        size: file.size,
      }),
    });
    if (res.status === 503) return { ok: false, reason: 'unconfigured' };
    if (!res.ok) return { ok: false, reason: 'failed' };
    const data = (await res.json()) as { uploadUrl: string; key: string };
    return { ok: true, ...data };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}

export function putWithProgress(
  url: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('content-type', file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(String(xhr.status)));
    xhr.onerror = () => reject(new Error('network'));
    xhr.send(file);
  });
}

/** Read an audio file's duration in whole seconds via a throwaway element. */
export function readAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const el = document.createElement('audio');
    const url = URL.createObjectURL(file);
    el.preload = 'metadata';
    el.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(el.duration) ? Math.round(el.duration) : 0);
    };
    el.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('metadata'));
    };
    el.src = url;
  });
}
