import { getCloudflareContext } from "@opennextjs/cloudflare";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { cwd } from "node:process";

/**
 * Media storage — Cloudflare R2, with a local-filesystem fallback.
 *
 * Images and PDFs must not go into D1 (it is a SQL store for text and
 * structured data), so uploads are written to the `UPLOADS` R2 bucket declared
 * in `wrangler.jsonc`. Objects are served back through `/api/media/[...key]`.
 *
 * When the R2 binding is unavailable — i.e. plain `next dev` without the
 * Wrangler platform proxy — we fall back to `public/`, which keeps local
 * development working. That fallback is inert on Workers, where the filesystem
 * is read-only.
 */
const BINDING = "UPLOADS";

type Bucket = {
  put: (key: string, data: ArrayBuffer | Uint8Array, options?: { httpMetadata?: { contentType?: string } }) => Promise<unknown>;
  get: (key: string) => Promise<{ body: ReadableStream; httpMetadata?: { contentType?: string }; size: number } | null>;
  delete: (key: string) => Promise<unknown>;
};

/** Resolve the R2 bucket, or undefined when the binding is not available. */
export function tryGetBucket(): Bucket | undefined {
  try {
    const { env } = getCloudflareContext();
    return (env as unknown as Record<string, Bucket | undefined>)[BINDING];
  } catch {
    // No Cloudflare context (e.g. a script outside a request).
    return undefined;
  }
}

export function getBucket(): Bucket {
  const bucket = tryGetBucket();
  if (!bucket) {
    throw new Error(
      `R2 binding \`${BINDING}\` is missing. Add the \`r2_buckets\` entry to wrangler.jsonc.`,
    );
  }
  return bucket;
}

/**
 * Store an uploaded file. Returns true when it went to R2, false when it fell
 * back to the local filesystem.
 */
export async function putMedia(
  key: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<{ stored: "r2" | "local" }> {
  const bucket = tryGetBucket();
  if (bucket) {
    await bucket.put(key, bytes, { httpMetadata: { contentType } });
    return { stored: "r2" };
  }
  const target = join(cwd(), "public", key);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, bytes);
  return { stored: "local" };
}

/** Fetch a stored object. `null` when it does not exist. */
export async function getMedia(
  key: string,
): Promise<{ body: ReadableStream; contentType: string } | null> {
  const bucket = tryGetBucket();
  if (bucket) {
    const object = await bucket.get(key);
    if (!object) return null;
    return {
      body: object.body,
      contentType: object.httpMetadata?.contentType ?? "application/octet-stream",
    };
  }
  // Local fallback: stream the file out of `public/`.
  const { readFile } = await import("node:fs/promises");
  try {
    const data = await readFile(join(cwd(), "public", key));
    return {
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(data));
          controller.close();
        },
      }),
      contentType: guessContentType(key),
    };
  } catch {
    return null;
  }
}

/** Best-effort content type for the local fallback path. */
function guessContentType(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    zip: "application/zip",
    txt: "text/plain",
  };
  return map[ext] ?? "application/octet-stream";
}

/** Public URL for a stored object. */
export function mediaUrl(key: string): string {
  return `/api/media/${key}`;
}
