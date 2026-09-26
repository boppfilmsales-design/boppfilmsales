import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { mediaUrl, putMedia } from "@/lib/media-storage";

export const dynamic = "force-dynamic";

const ALLOWED_FOLDERS = [
  "uploads/products",
  "uploads/content",
  "uploads/gallery",
  "uploads/images",
  "downloads",
];

function sanitizeFileName(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
  if (!base || base === "_") return "file";
  return base;
}

/**
 * Admin file upload endpoint.
 *
 * Files go to Cloudflare R2 (see `src/lib/media-storage.ts`) rather than the
 * local `public/` directory: D1 stores text and structured data only, and the
 * Workers filesystem is read-only, so uploads must live in object storage to
 * survive a deploy. The frontend only needs the returned URL, which is served
 * back by `/api/media/[...key]`.
 *
 * When the R2 binding is absent (plain `next dev`), the storage layer falls
 * back to `public/` so local development keeps working.
 */
export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const requestedFolder = String(formData.get("folder") ?? "uploads/products");
    const folder = ALLOWED_FOLDERS.includes(requestedFolder) ? requestedFolder : "uploads/products";

    if (!file || !(file instanceof File) || file.size === 0) {
      return NextResponse.json({ ok: false, error: "请选择要上传的文件" }, { status: 400 });
    }

    const originalName = file.name || "upload.bin";
    const safeName = sanitizeFileName(originalName);
    const uniqueName = `${Date.now()}_${safeName}`;

    const buffer = new Uint8Array(await file.arrayBuffer());
    const key = `${folder}/${uniqueName}`;
    const { stored } = await putMedia(key, buffer, file.type || "application/octet-stream");

    return NextResponse.json({ ok: true, url: mediaUrl(key), name: originalName, stored });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || "上传失败" }, { status: 500 });
  }
}
