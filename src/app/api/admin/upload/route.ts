import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { cwd } from "node:process";

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
 * Admin file upload endpoint. Saves files to the local `public/` directory so
 * they are served as static assets during development.
 *
 * For production (Vercel / Cloudflare Workers), replace this with a cloud
 * storage provider (S3, R2, Vercel Blob, etc.). The frontend only needs the
 * returned URL, so swapping the backend is straightforward.
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

    const destDir = join(cwd(), "public", folder);
    await mkdir(destDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(join(destDir, uniqueName), buffer);

    const url = `/${folder}/${uniqueName}`;
    return NextResponse.json({ ok: true, url, name: originalName });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || "上传失败" }, { status: 500 });
  }
}
