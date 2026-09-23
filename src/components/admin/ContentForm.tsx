"use client";

import { useState } from "react";
import type { SiteContent } from "@/lib/site";

export default function ContentForm({ content, onCancel, onSaved }: {
  content: SiteContent;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(content.name);
  const [nameZh, setNameZh] = useState(content.nameZh);
  const [items, setItems] = useState(JSON.stringify(content.items ?? {}, null, 2));
  const [itemsZh, setItemsZh] = useState(JSON.stringify(content.itemsZh ?? {}, null, 2));
  const [entries, setEntries] = useState(JSON.stringify(content.entries ?? [], null, 2));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/content/${content.sourceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          nameZh,
          items: JSON.parse(items),
          itemsZh: JSON.parse(itemsZh),
          entries: JSON.parse(entries),
        }),
      });
      const data = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error ?? "保存失败");
      onSaved();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "JSON 格式或保存失败");
    } finally {
      setBusy(false);
    }
  }

  const input = "mt-1 w-full border border-[#ddd] px-3 py-2 text-[13px] outline-none focus:border-[#e61d39]";
  return (
    <form className="mb-5 border border-[#e3e3e3] bg-white p-5" onSubmit={submit}>
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-bold text-[#333]">编辑栏目：{content.name}</h2>
        <button className="text-[12px] text-[#888] hover:text-[#e61d39]" onClick={onCancel} type="button">关闭 ✕</button>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="text-[12px] font-bold text-[#555]">英文栏目名称<input className={input} onChange={(event) => setName(event.target.value)} value={name} /></label>
        <label className="text-[12px] font-bold text-[#555]">中文栏目名称<input className={input} onChange={(event) => setNameZh(event.target.value)} value={nameZh} /></label>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <label className="text-[12px] font-bold text-[#555]">英文数据 JSON<textarea className={`${input} h-72 font-mono text-[11px]`} onChange={(event) => setItems(event.target.value)} value={items} /></label>
        <label className="text-[12px] font-bold text-[#555]">中文数据 JSON<textarea className={`${input} h-72 font-mono text-[11px]`} onChange={(event) => setItemsZh(event.target.value)} value={itemsZh} /></label>
        <label className="text-[12px] font-bold text-[#555]">列表/文章 entries JSON<textarea className={`${input} h-72 font-mono text-[11px]`} onChange={(event) => setEntries(event.target.value)} value={entries} /></label>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button className="bg-[#e61d39] px-6 py-2 text-[13px] font-bold text-white disabled:opacity-60" disabled={busy} type="submit">{busy ? "保存中..." : "保存栏目"}</button>
        {message ? <span className="text-[12px] text-[#e61d39]">{message}</span> : null}
      </div>
    </form>
  );
}
