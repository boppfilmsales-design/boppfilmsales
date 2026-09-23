"use client";

import { useState } from "react";

export type UploadFolder =
  | "uploads/products"
  | "uploads/content"
  | "uploads/gallery"
  | "uploads/images"
  | "downloads";

export async function uploadAdminFile(file: File, folder: UploadFolder) {
  const form = new FormData();
  form.append("file", file);
  form.append("folder", folder);
  const res = await fetch("/api/admin/upload", { method: "POST", body: form });
  const data = (await res.json()) as { ok?: boolean; url?: string; error?: string };
  if (!data.ok) throw new Error(data.error || "上传失败");
  return data.url as string;
}

export function UploadButton({
  folder,
  accept,
  onUploaded,
  label,
  title,
}: {
  folder: UploadFolder;
  accept: string;
  onUploaded: (url: string, file: File) => void;
  label?: string;
  title?: string;
}) {
  const [uploading, setUploading] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadAdminFile(file, folder);
      onUploaded(url, file);
    } catch (err: any) {
      alert(err.message || "上传失败");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <label
      title={title}
      className={`inline-flex cursor-pointer items-center rounded border border-[#ddd] bg-[#f9f9f9] px-3 py-1 text-[12px] text-[#555] hover:bg-[#eee] ${uploading ? "opacity-60" : ""}`}
    >
      <span>{uploading ? "上传中..." : (label || "上传")}</span>
      <input type="file" accept={accept} className="hidden" onChange={handleChange} disabled={uploading} />
    </label>
  );
}
