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
 * Two fallbacks exist, in this order:
 *
 *   1. `MEDIA_ORIGIN` — set on Vercel, where the R2 binding does not exist.
 *      `/api/media/*` redirects to the canonical Workers deployment, which
 *      reads the same bucket natively. No S3 credentials, no double storage.
 *   2. `public/` — plain `next dev` without the Wrangler platform proxy. Inert
 *      on Workers, where the filesystem is read-only.
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
 * Base URL of the deployment that owns the R2 bucket.
 *
 * Set `MEDIA_ORIGIN` on Vercel (e.g. `https://www.boppfilmsales.com`). When it
 * is present and the R2 binding is not, `/api/media/*` redirects there instead
 * of trying to read a bucket it cannot see. Returns undefined on Workers and
 * whenever the variable is absent or malformed, so every existing path keeps
 * working unchanged.
 */
export function remoteMediaBase(): string | undefined {
  if (tryGetBucket()) return undefined;
  const raw = (process.env.MEDIA_ORIGIN ?? "").trim();
  if (!raw || !/^https?:\/\//i.test(raw)) return undefined;
  return raw.replace(/\/+$/, "");
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

/**
 * Read a file from the local fallback tree.
 *
 * `public/` is checked first. During a Cloudflare build the legacy library is
 * parked in `.local-media/` (see `scripts/local-media.mjs`), so that directory
 * is checked next — that way `next dev` keeps rendering images even while the
 * assets are excluded from the Worker bundle.
 */
async function readLocalFile(key: string): Promise<Uint8Array | null> {
  const { readFile } = await import("node:fs/promises");
  for (const base of ["public", ".local-media"]) {
    try {
      return await readFile(join(cwd(), base, key));
    } catch {
      // try the next location
    }
  }
  return null;
}

/** Fetch a stored object. `null` when it does not exist. */
export async function getMedia(
  key: string,
): Promise<{ body: ReadableStream; contentType: string; size: number } | null> {
  const bucket = tryGetBucket();
  if (bucket) {
    const object = await bucket.get(key);
    if (object) {
      return {
        body: object.body,
        contentType: object.httpMetadata?.contentType ?? "application/octet-stream",
        size: object.size ?? 0,
      };
    }
    // Miss. On Workers the local tree is empty so this just returns null, but
    // under `next dev` the R2 binding is an empty local emulation, and falling
    // through is what lets the real images render.
  }
  const data = await readLocalFile(key);
  if (!data) return null;
  return {
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(data));
        controller.close();
      },
    }),
    contentType: guessContentType(key),
    size: data.byteLength,
  };
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
