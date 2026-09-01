// Client-side helper for the admin media uploads (Phase 7 PDF, Phase 8 audio).
// The file is PUT straight to R2 with a signed URL; only the object key is
// submitted with the form.

export type UploadKind = 'script' | 'audio' | 'thumb';

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

/**
 * Upload a cover image (rendered from a PDF's first page, or lifted from an
 * MP3's embedded art) to R2 and return its object key. A cover is a nicety —
 * every failure path returns null and the caller carries on.
 */
export async function uploadThumbnail(blob: Blob): Promise<string | null> {
  const file = new File([blob], 'cover.jpg', { type: 'image/jpeg' });
  const signed = await getSignedUpload('thumb', file);
  if (!signed.ok) return null;
  try {
    await putWithProgress(signed.uploadUrl, file, () => {});
  } catch {
    return null;
  }
  return signed.key;
}

/**
 * Decode any browser-supported image and re-encode it as a JPEG no larger than
 * `maxEdge` on its long side. Normalises embedded album art (often a 3000px
 * PNG) into something small and predictable for a library card.
 */
export function normaliseToJpeg(
  blob: Blob,
  maxEdge: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const long = Math.max(img.naturalWidth, img.naturalHeight) || 1;
      const scale = Math.min(1, maxEdge / long);
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((out) => resolve(out), 'image/jpeg', 0.82);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

/**
 * Pull the front-cover image out of an MP3's ID3v2 tag (APIC frame, or PIC in
 * the older v2.2), normalised to a small JPEG. Returns null when there is no
 * tag, no picture frame, or the tag cannot be parsed — album art is optional.
 *
 * Handles v2.2 / v2.3 / v2.4 frame headers and tag-level unsynchronisation.
 * The picture payload is found by scanning the frame body for a JPEG or PNG
 * signature rather than parsing the (encoding-dependent) description field.
 */
export async function readEmbeddedCover(file: File): Promise<Blob | null> {
  try {
    const header = new Uint8Array(await file.slice(0, 10).arrayBuffer());
    if (header.length < 10 || !isId3(header)) return null;
    const tagSize = syncsafe(header, 6);
    const end = Math.min(10 + tagSize, file.size, 12 * 1024 * 1024);
    const tag = new Uint8Array(await file.slice(0, end).arrayBuffer());

    const image = findEmbeddedPicture(tag);
    if (!image) return null;
    return normaliseToJpeg(
      new Blob([new Uint8Array(image.bytes)], { type: image.mime }),
      600,
    );
  } catch {
    return null;
  }
}

function isId3(b: Uint8Array): boolean {
  return (
    b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33 && b[3] >= 2 && b[3] <= 4
  );
}

/**
 * Walk an ID3v2 tag (the full tag including its 10-byte header) and return the
 * bytes of its embedded front-cover image. Pure and DOM-free so it can be
 * tested directly. Handles v2.2 / v2.3 / v2.4 frame headers and tag-level
 * unsynchronisation; the picture payload is located by scanning the frame body
 * for a JPEG or PNG signature rather than parsing the description field.
 */
export function findEmbeddedPicture(
  tag: Uint8Array,
): { bytes: Uint8Array; mime: string } | null {
  if (tag.length < 20 || !isId3(tag)) return null;
  const version = tag[3];
  const unsync = (tag[5] & 0x80) !== 0;
  const hasExtHeader = (tag[5] & 0x40) !== 0;

  let bytes = tag.subarray(10);
  if (unsync) bytes = deunsync(bytes);

  let p = 0;
  if (hasExtHeader) {
    p += version === 4 ? syncsafe(bytes, 0) : 4 + big32(bytes, 0); // v2.3 ext-header size excludes itself
  }

  const idLen = version === 2 ? 3 : 4;
  const frameHeaderLen = version === 2 ? 6 : 10;
  const pictureId = version === 2 ? 'PIC' : 'APIC';

  while (p + frameHeaderLen <= bytes.length) {
    const id = ascii(bytes, p, idLen);
    if (id.charCodeAt(0) === 0) break; // padding
    if (!/^[A-Z0-9]+$/.test(id)) break; // out of sync — stop

    let size: number;
    if (version === 2) size = big24(bytes, p + 3);
    else if (version === 3) size = big32(bytes, p + 4);
    else size = syncsafe(bytes, p + 4);

    if (size <= 0 || p + frameHeaderLen + size > bytes.length) break;

    if (id === pictureId) {
      const body = bytes.subarray(
        p + frameHeaderLen,
        p + frameHeaderLen + size,
      );
      const image = carveImage(body);
      if (image) return image;
    }
    p += frameHeaderLen + size;
  }
  return null;
}

function ascii(b: Uint8Array, off: number, len: number): string {
  let s = '';
  for (let i = 0; i < len; i++) s += String.fromCharCode(b[off + i]);
  return s;
}

function big24(b: Uint8Array, o: number): number {
  return (b[o] << 16) | (b[o + 1] << 8) | b[o + 2];
}

function big32(b: Uint8Array, o: number): number {
  return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
}

/** 28-bit integer stored 7 bits per byte (ID3's "synchsafe" encoding). */
function syncsafe(b: Uint8Array, o: number): number {
  return (b[o] << 21) | (b[o + 1] << 14) | (b[o + 2] << 7) | b[o + 3];
}

/** Collapse the `FF 00` pairs an unsynchronised tag inserts after every `FF`. */
function deunsync(b: Uint8Array): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(b.length);
  let n = 0;
  for (let i = 0; i < b.length; i++) {
    out[n++] = b[i];
    if (b[i] === 0xff && b[i + 1] === 0x00) i++;
  }
  return out.slice(0, n);
}

/** Find the JPEG or PNG payload inside an APIC/PIC frame body. */
function carveImage(
  body: Uint8Array,
): { bytes: Uint8Array; mime: string } | null {
  const limit = Math.min(body.length - 4, 128);
  for (let i = 0; i < limit; i++) {
    if (body[i] === 0xff && body[i + 1] === 0xd8 && body[i + 2] === 0xff) {
      let e = body.length;
      for (let j = body.length - 2; j > i; j--) {
        if (body[j] === 0xff && body[j + 1] === 0xd9) {
          e = j + 2;
          break;
        }
      }
      return { bytes: body.subarray(i, e), mime: 'image/jpeg' };
    }
    if (
      body[i] === 0x89 &&
      body[i + 1] === 0x50 &&
      body[i + 2] === 0x4e &&
      body[i + 3] === 0x47
    ) {
      let e = body.length;
      for (let j = i + 8; j + 4 <= body.length; j++) {
        if (
          body[j] === 0x49 &&
          body[j + 1] === 0x45 &&
          body[j + 2] === 0x4e &&
          body[j + 3] === 0x44
        ) {
          e = Math.min(body.length, j + 8);
          break;
        }
      }
      return { bytes: body.subarray(i, e), mime: 'image/png' };
    }
  }
  return null;
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
