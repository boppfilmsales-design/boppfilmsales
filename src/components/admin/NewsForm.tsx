"use client";

import { useEffect, useState } from "react";
import RichEditor from "./RichEditor";

export type AdminCategory = { id: number; slug: string; name: string; sourceId?: number };

export type AdminPostDetail = {
  id: number;
  categoryId: number;
  title: string;
  listDate: string;
  newsDate: string;
  excerpt: string;
  image: string;
  bodyHtml: string;
  bodyText: string;
  isPublished: boolean;
};

function today(offsetDays = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function mmddyyyy(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return match ? `${match[2]}/${match[3]}/${match[1]}` : "";
}

export default function NewsForm({
  categories,
  post,
  defaultCategoryId,
  onCancel,
  onSaved,
}: {
  categories: AdminCategory[];
  post?: AdminPostDetail | null;
  defaultCategoryId?: number;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [categoryId, setCategoryId] = useState<number>(post?.categoryId ?? defaultCategoryId ?? categories[0]?.id ?? 0);
  const [title, setTitle] = useState(post?.title ?? "");
  const [listDate, setListDate] = useState(post?.listDate ?? mmddyyyy(today()));
  const [newsDate, setNewsDate] = useState(post?.newsDate ?? today());
  const [image, setImage] = useState(post?.image ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [bodyHtml, setBodyHtml] = useState(post?.bodyHtml ?? "");
  const [isPublished, setIsPublished] = useState(post?.isPublished ?? true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (post) {
      setBodyHtml(post.bodyHtml);
    }
  }, [post]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const payload = {
      categoryId,
      title,
      listDate,
      newsDate,
      excerpt,
      image,
      isPublished,
      bodyHtml,
      bodyText: "",
    };
    const response = await fetch(post ? `/api/admin/posts/${post.id}` : "/api/admin/posts", {
      method: post ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as { ok?: boolean; error?: string };
    setBusy(false);
    if (!response.ok || !data.ok) {
      setMessage(data.error ?? "Save failed.");
      return;
    }
    setMessage("Saved successfully.");
    onSaved();
  }

  const inputClass =
    "mt-1 w-full border border-[#ddd] px-3 py-[9px] text-[13px] outline-none focus:border-[#e61d39]";
  const labelClass = "block text-[12px] font-bold text-[#555]";

  return (
    <form className="border border-[#e3e3e3] bg-white p-5" onSubmit={submit}>
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-bold text-[#333]">
          {post ? `Edit article #${post.id}` : "Add article"}
        </h2>
        <button className="text-[12px] text-[#888] hover:text-[#e61d39]" onClick={onCancel} type="button">
          close ✕
        </button>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className={labelClass}>
          Column
          <select
            className={inputClass}
            onChange={(event) => setCategoryId(Number.parseInt(event.target.value, 10))}
            value={categoryId}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Title
          <input className={inputClass} onChange={(event) => setTitle(event.target.value)} value={title} />
        </label>
        <label className={labelClass}>
          List date (MM/DD/YYYY, shown in the list)
          <input className={inputClass} onChange={(event) => setListDate(event.target.value)} value={listDate} />
        </label>
        <label className={labelClass}>
          News date (shown on the detail page)
          <input
            className={inputClass}
            onChange={(event) => setNewsDate(event.target.value)}
            type="date"
            value={newsDate}
          />
        </label>
        <label className={labelClass}>
          Thumbnail image URL or /uploads/news/... path
          <input className={inputClass} onChange={(event) => setImage(event.target.value)} value={image} />
        </label>
        <label className={labelClass}>
          Summary (leave blank to auto-generate)
          <input className={inputClass} onChange={(event) => setExcerpt(event.target.value)} value={excerpt} />
        </label>
      </div>

      <div className="mt-4">
        <label className={labelClass}>Article body (rich text / 富文本)</label>
        <div className="mt-1">
          <RichEditor
            value={bodyHtml}
            onChange={setBodyHtml}
            placeholder="在此编辑文章内容，支持加粗、列表、链接、图片、表格、上传等..."
            height={320}
          />
        </div>
      </div>

      <label className="mt-4 flex items-center gap-2 text-[13px] text-[#555]">
        <input
          checked={isPublished}
          onChange={(event) => setIsPublished(event.target.checked)}
          type="checkbox"
        />
        Published (visible on the website)
      </label>

      <div className="mt-5 flex items-center gap-3">
        <button
          className="bg-[#e61d39] px-6 py-[10px] text-[13px] font-bold uppercase text-white disabled:opacity-60"
          disabled={busy}
          type="submit"
        >
          {busy ? "Saving..." : post ? "Update" : "Publish"}
        </button>
        {message ? <span className="text-[12px] text-[#666]">{message}</span> : null}
      </div>
    </form>
  );
}
