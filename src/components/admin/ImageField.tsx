"use client";

import { UploadButton } from "./FileUpload";
import RemoteLinkField from "./RemoteLinkField";

export default function ImageField({
  value,
  onChange,
  label,
  folder = "uploads/products",
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  folder?: "uploads/products" | "uploads/content" | "uploads/gallery" | "uploads/images";
}) {
  return (
    <div className="space-y-2">
      {label ? <p className="text-[12px] font-bold text-[#555]">{label}</p> : null}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="图片路径，如 /api/media/uploads/products/xxx.jpg 或 https://图床/xxx.jpg"
          className="w-full border border-[#ddd] px-3 py-2 text-[13px] outline-none focus:border-[#e61d39]"
        />
        <UploadButton
          folder={folder}
          accept="image/*"
          label="上传图片"
          title="从本地上传图片"
          onUploaded={(url) => onChange(url)}
        />
      </div>
      <RemoteLinkField applyLabel="填入封面" onApply={(url) => onChange(url)} />
      {value ? (
        <div className="relative inline-block max-w-full rounded border border-[#eee] bg-[#fafafa] p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="preview" className="max-h-[160px] max-w-full rounded object-contain" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-1 top-1 rounded bg-[#e61d39] px-2 py-1 text-[11px] text-white hover:opacity-80"
          >
            删除
          </button>
        </div>
      ) : (
        <div className="flex h-[100px] w-[160px] items-center justify-center rounded border border-dashed border-[#ccc] bg-[#fafafa] text-[12px] text-[#aaa]">
          暂无图片
        </div>
      )}
    </div>
  );
}
