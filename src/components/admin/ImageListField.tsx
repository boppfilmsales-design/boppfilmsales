"use client";

import { UploadButton } from "./FileUpload";

export default function ImageListField({
  images,
  onChange,
  folder = "uploads/gallery",
}: {
  images: string[];
  onChange: (images: string[]) => void;
  folder?: "uploads/products" | "uploads/content" | "uploads/gallery" | "uploads/images";
}) {
  const update = (idx: number, url: string) => {
    const next = [...images];
    next[idx] = url;
    onChange(next);
  };

  const remove = (idx: number) => {
    onChange(images.filter((_, i) => i !== idx));
  };

  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };

  const addEmpty = () => onChange([...images, ""]);

  return (
    <div className="space-y-3">
      {images.map((url, idx) => (
        <div key={idx} className="flex items-start gap-3 rounded border border-[#eee] bg-white p-3">
          <div className="shrink-0">
            {url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={url} alt="" className="h-[80px] w-[120px] rounded border border-[#eee] object-cover" />
            ) : (
              <div className="flex h-[80px] w-[120px] items-center justify-center rounded border border-dashed border-[#ccc] bg-[#fafafa] text-[12px] text-[#aaa]">
                暂无
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={url}
                onChange={(e) => update(idx, e.target.value)}
                placeholder="图片路径 或 https://图床链接"
                className="flex-1 border border-[#ddd] px-3 py-2 text-[13px] outline-none focus:border-[#e61d39]"
              />
              <UploadButton
                folder={folder}
                accept="image/*"
                label="上传"
                title="上传图片"
                onUploaded={(u) => update(idx, u)}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => move(idx, -1)}
                disabled={idx === 0}
                className="rounded border border-[#ddd] bg-[#f9f9f9] px-2 py-1 text-[11px] text-[#555] hover:bg-[#eee] disabled:opacity-40"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(idx, 1)}
                disabled={idx === images.length - 1}
                className="rounded border border-[#ddd] bg-[#f9f9f9] px-2 py-1 text-[11px] text-[#555] hover:bg-[#eee] disabled:opacity-40"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => remove(idx)}
                className="rounded bg-[#e61d39] px-2 py-1 text-[11px] text-white hover:opacity-80"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={addEmpty}
        className="w-full rounded border border-dashed border-[#ccc] px-3 py-2 text-[12px] text-[#888] hover:border-[#e61d39] hover:text-[#e61d39]"
      >
        + 添加图片
      </button>
    </div>
  );
}
