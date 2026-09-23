"use client";

import { UploadButton } from "./FileUpload";

export default function PdfListField({
  pdfs,
  onChange,
}: {
  pdfs: Array<{ file: string; label: string }>;
  onChange: (pdfs: Array<{ file: string; label: string }>) => void;
}) {
  const update = (idx: number, patch: Partial<{ file: string; label: string }>) => {
    const next = pdfs.map((pdf, i) => (i === idx ? { ...pdf, ...patch } : pdf));
    onChange(next);
  };

  const remove = (idx: number) => {
    onChange(pdfs.filter((_, i) => i !== idx));
  };

  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= pdfs.length) return;
    const next = [...pdfs];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };

  const addEmpty = () => onChange([...pdfs, { label: "", file: "" }]);

  return (
    <div className="space-y-3">
      {pdfs.map((pdf, idx) => (
        <div key={idx} className="rounded border border-[#eee] bg-white p-3">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-[11px] font-bold text-[#777]">
              显示名称
              <input
                type="text"
                value={pdf.label}
                onChange={(e) => update(idx, { label: e.target.value })}
                placeholder="如: 技术参数表"
                className="mt-1 w-full border border-[#ddd] px-3 py-2 text-[13px] outline-none focus:border-[#e61d39]"
              />
            </label>
            <label className="block text-[11px] font-bold text-[#777]">
              文件路径
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="text"
                  value={pdf.file}
                  onChange={(e) => update(idx, { file: e.target.value })}
                  placeholder="/downloads/xxx.pdf 或 https://..."
                  className="min-w-0 flex-1 border border-[#ddd] px-3 py-2 text-[13px] outline-none focus:border-[#e61d39]"
                />
                <UploadButton
                  folder="downloads"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
                  label="上传"
                  title="上传 PDF/Word/Excel 等"
                  onUploaded={(url) => update(idx, { file: url })}
                />
              </div>
            </label>
          </div>
          <div className="mt-2 flex gap-2">
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
              disabled={idx === pdfs.length - 1}
              className="rounded border border-[#ddd] bg-[#f9f9f9] px-2 py-1 text-[11px] text-[#555] hover:bg-[#eee] disabled:opacity-40"
            >
              ↓
            </button>
            {pdf.file ? (
              <a
                href={pdf.file}
                target="_blank"
                rel="noopener"
                className="rounded bg-[#f4f4f4] px-2 py-1 text-[11px] text-[#1c6dd0] hover:underline"
              >
                预览
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => remove(idx)}
              className="rounded bg-[#e61d39] px-2 py-1 text-[11px] text-white hover:opacity-80"
            >
              删除
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={addEmpty}
        className="w-full rounded border border-dashed border-[#ccc] px-3 py-2 text-[12px] text-[#888] hover:border-[#e61d39] hover:text-[#e61d39]"
      >
        + 添加 PDF
      </button>
    </div>
  );
}
