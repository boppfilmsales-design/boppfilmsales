import { getMedia } from "@/lib/media-storage";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ key: string[] }> };

/**
 * Serves media stored in Cloudflare R2 (or the local `public/` fallback).
 *
 * Uploaded files live in object storage, so they are not part of the static
 * asset bundle and have to be streamed back through a route. Filenames are
 * prefixed with a timestamp by the upload endpoint, so they can be cached
 * aggressively.
 */
export async function GET(_request: Request, context: RouteContext) {
  const { key } = await context.params;

  // Reject traversal attempts before touching storage.
  if (!key || key.some((segment) => segment === ".." || segment === "" || segment.includes("\\"))) {
    return new Response("Bad Request", { status: 400 });
  }
  const objectKey = key.join("/");

  try {
    const media = await getMedia(objectKey);
    if (!media) return new Response("Not Found", { status: 404 });
    return new Response(media.body, {
      headers: {
        "Content-Type": media.contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not Found", { status: 404 });
  }
}
