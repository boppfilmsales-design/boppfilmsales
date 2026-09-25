"use client";

import { useState } from "react";

/**
 * "图床链接地址" helper row. Lets the operator paste an externally hosted
 * image / PDF URL instead of uploading the file to the site, so Vercel
 * storage stays small. The URL is validated and handed to the parent via
 * onApply; the field clears itself afterwards.
 */
export default function RemoteLinkField({
  onApply,
  applyLabel = "填入",
  placeholder = "https://图床域名/xxx.jpg",
  hint = "粘贴外部图床地址后点右侧按钮即可填入，文件保存在图床、不占用网站空间。",
}: {
  onApply: (url: string) => void;
  applyLabel?: string;
  placeholder?: string;
  hint?: string;
}) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const apply = () => {
    const value = url.trim();
    if (!value) {
      setError("请先粘贴图床链接地址");
      return;
    }
    if (!/^https?:\/\/\S+$/i.test(value)) {
      setError("图床链接需要以 http:// 或 https:// 开头");
      return;
    }
    setError("");
    onApply(value);
    setUrl("");
  };

  return (
    <div className="rounded border border-dashed border-[#9ec5e8] bg-[#f4f9ff] p-2">
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-[11px] font-bold text-[#1c6dd0]">图床链接地址</span>
        <input
          className="min-w-0 flex-1 border border-[#cfe3f5] px-2 py-[6px] text-[12px] outline-none focus:border-[#1c6dd0]"
          onChange={(event) => {
            setUrl(event.target.value);
            if (error) setError("");
          }}
          onKeyDown={(event) => {
            // These fields live inside the admin <form>; Enter would submit it.
            if (event.key === "Enter") {
              event.preventDefault();
              apply();
            }
          }}
          placeholder={placeholder}
          type="text"
          value={url}
        />
        <button
          className="shrink-0 rounded bg-[#1c6dd0] px-3 py-[6px] text-[11px] font-bold text-white hover:opacity-85"
          onClick={apply}
          type="button"
        >
          {applyLabel}
        </button>
      </div>
      <p className={`mt-1 text-[11px] ${error ? "text-[#e61d39]" : "text-[#7d97ad]"}`}>
        {error || hint}
      </p>
    </div>
  );
}
