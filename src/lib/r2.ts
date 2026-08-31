import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Cloudflare R2, addressed only through the S3-compatible API. The bucket is
// private — no object is ever reachable without a signature (Docs/5 §14).
// These vars are SERVER ONLY; they never reach a client bundle.

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET = process.env.R2_BUCKET;
const ENDPOINT =
  process.env.R2_ENDPOINT ||
  (ACCOUNT_ID ? `https://${ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined);

export const GET_URL_TTL_SECONDS = 900; // 15 minutes (Docs/5 §14)
export const PUT_URL_TTL_SECONDS = 300;

/** Per-type upload limits. PDF confirmed at 25 MB (Phase 7 owner decision). */
export const UPLOAD_LIMITS = {
  script: { maxBytes: 25 * 1024 * 1024, contentType: 'application/pdf' },
} as const;

export function isR2Configured(): boolean {
  return Boolean(ACCESS_KEY_ID && SECRET_ACCESS_KEY && BUCKET && ENDPOINT);
}

let client: S3Client | null = null;

function r2(): S3Client {
  if (!isR2Configured()) {
    throw new Error('R2 is not configured — set R2_* in the environment.');
  }
  client ??= new S3Client({
    region: 'auto',
    endpoint: ENDPOINT,
    credentials: {
      accessKeyId: ACCESS_KEY_ID!,
      secretAccessKey: SECRET_ACCESS_KEY!,
    },
  });
  return client;
}

/** A random object key for a new upload of the given kind. */
export function newObjectKey(kind: 'script' | 'audio', ext: string): string {
  return `${kind}s/${crypto.randomUUID()}.${ext}`;
}

/**
 * A short-lived signed URL to read one object. Pass `downloadName` to make the
 * browser save the file rather than display it inline.
 */
export async function presignGet(
  key: string,
  downloadName?: string,
): Promise<string> {
  return getSignedUrl(
    r2(),
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ...(downloadName
        ? {
            ResponseContentDisposition: `attachment; filename="${downloadName.replace(/["\\]/g, '')}"`,
          }
        : {}),
    }),
    { expiresIn: GET_URL_TTL_SECONDS },
  );
}

/** A short-lived signed URL the browser PUTs a new object to. */
export async function presignPut(
  key: string,
  contentType: string,
): Promise<string> {
  return getSignedUrl(
    r2(),
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: PUT_URL_TTL_SECONDS },
  );
}
