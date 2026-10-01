import { getMedia, remoteMediaBase } from "@/lib/media-storage";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ key: string[] }> };

/**
 * Biggest objects we are willing to copy into the Cloudflare cache.
 *
 * `cache.put()` consumes a second branch of the stream, so the bytes live in
 * the isolate for the duration of the upload. A 40 MB PDF would push an
 * isolate that is already hovering near the 128 MB ceiling over the edge and
 * turn a perfectly fine request into Error 1102, so only small objects (the
 * images the site is actually made of) are cached; large files are streamed
 * straight from R2 as before.
 */
const CACHEABLE_MAX_BYTES = 5 * 1024 * 1024;

/**
 * `caches.default` exists on Workers; it is absent under plain `next dev`.
 * The DOM `CacheStorage` type has no `default` member, hence the cast.
 */
function edgeCache(): Cache | undefined {
  const caches = (globalThis as { caches?: { default?: Cache } }).caches;
  return caches?.default;
}

/**
 * Serves media stored in Cloudflare R2 (or the local `public/` fallback).
 *
 * Uploaded files live in object storage, so they are not part of the static
 * asset bundle and have to be streamed back through a route. Filenames are
 * prefixed with a timestamp by the upload endpoint, so they can be cached
 * aggressively.
 *
 * The response is stored in the Cloudflare cache first: a page carries tens of
 * images, and without this every single one of them re-runs the Worker and
 * re-reads R2.
 */
export async function GET(request: Request, context: RouteContext) {
  const { key } = await context.params;

  // Reject traversal attempts before touching storage.
  if (!key || key.some((segment) => segment === ".." || segment === "" || segment.includes("\\"))) {
    return new Response("Bad Request", { status: 400 });
  }
  const objectKey = key.join("/");

  // Off-Workers (Vercel) there is no R2 binding, so hand the request to the
  // deployment that owns the bucket rather than 404ing every image.
  const remote = remoteMediaBase();
  if (remote) {
    return Response.redirect(
      `${remote}/api/media/${key.map(encodeURIComponent).join("/")}`,
      307,
    );
  }

  const cache = edgeCache();
  if (cache) {
    try {
      const hit = await cache.match(request);
      if (hit) return hit;
    } catch {
      // Cache lookup is best-effort; fall through to R2.
    }
  }

  try {
    const media = await getMedia(objectKey);
    if (!media) return new Response("Not Found", { status: 404 });

    const headers = {
      "Content-Type": media.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    };
    const response = new Response(media.body, { headers });

    if (cache && media.size > 0 && media.size <= CACHEABLE_MAX_BYTES) {
      try {
        // Awaited on purpose: `no_handle_cross_request_promise_resolution` is
        // enabled, so a floating put() would simply be dropped.
        await cache.put(request, response.clone());
      } catch {
        // Never fail the request because the cache rejected the object.
      }
    }
    return response;
  } catch {
    return new Response("Not Found", { status: 404 });
  }
}
