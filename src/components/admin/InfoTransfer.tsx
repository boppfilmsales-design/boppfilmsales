"use client";

import { useCallback, useEffect, useState } from "react";

type TransferColumn = {
  sourceId: number;
  name: string;
  sectionPid: number;
  sectionName: string;
  sectionNameEn: string;
  displayType: string;
  dataSource: string;
  itemCount: number;
  dbKind: string | null;
  dbName: string | null;
};

export default function InfoTransfer() {
  const [columns, setColumns] = useState<TransferColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"content" | "news">("content");
  const [fromSourceId, setFromSourceId] = useState("");
  const [toSourceId, setToSourceId] = useState("");
  const [copy, setCopy] = useState(false);
  const [result, setResult] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/advanced/transfer", { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setColumns(data.columns ?? []);
      setError("");
    } catch (err) {
      setError(`加载栏目列表失败：${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const newsColumns = columns.filter((c) => c.dataSource === "news-db");
  const contentColumns = columns.filter((c) => c.dataSource === "static" && c.dbKind);
  const options = mode === "news" ? newsColumns : contentColumns;

  const from = options.find((c) => String(c.sourceId) === fromSourceId);
  const to = options.find((c) => String(c.sourceId) === toSourceId);
  const sameKind = from && to && from.dbKind === to.dbKind;

  async function run() {
    if (!fromSourceId || !toSourceId) {
      setNotice("请先选择源栏目和目标栏目。");
      return;
    }
    if (fromSourceId === toSourceId) {
      setNotice("源栏目和目标栏目不能相同。");
      return;
    }
    if (mode === "content" && !copy) {
      const ok = window.confirm(
        `即将把「${from?.name}」的全部 ${from?.itemCount ?? 0} 条内容移动到「${to?.name}」。\n\n源栏目会被清空，操作会在留言板留下快照记录。确定继续？`,
      );
      if (!ok) return;
    }
    setBusy(true);
    setResult("");
    try {
      const res = await fetch("/api/admin/advanced/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, fromSourceId: Number(fromSourceId), toSourceId: Number(toSourceId), copy }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setNotice(`转移完成：共处理 ${data.moved} 条。`);
      if (data.snapshot) setResult(data.snapshot);
      void load();
    } catch (err) {
      setNotice(`转移失败：${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="border border-[#e3e3e3] bg-white py-16 text-center text-[13px] text-[#888]">加载中…</div>;
  }
  if (error) {
    return <div className="border border-red-300 bg-red-50 p-5 text-[13px] text-red-700">{error}</div>;
  }

  return (
    <div>
      <div className="border border-[#e3e3e3] bg-white p-5">
        <h2 className="text-[16px] font-bold text-[#333]">信息转移</h2>
        <p className="mt-1 text-[12px] leading-[20px] text-[#888]">
          把一个栏目的全部内容转移到另一个栏目。每次转移都会在「留言板」留下一条带快照的记录，便于回溯。
          <br />
          新闻转移会在三个新闻栏目之间迁移文章；内容转移会移动整列的列表条目。
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              ["content", "内容栏目转移"],
              ["news", "新闻栏目转移"],
            ] as const
          ).map(([key, label]) => (
            <button
              className={`border px-3 py-[6px] text-[12px] ${
                mode === key
                  ? "border-[#e61d39] bg-[#e61d39] font-bold text-white"
                  : "border-[#ddd] bg-white text-[#666] hover:border-[#bbb]"
              }`}
              key={key}
              onClick={() => {
                setMode(key);
                setFromSourceId("");
                setToSourceId("");
                setNotice("");
                setResult("");
              }}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto_1fr]">
          <label className="block">
            <span className="text-[12px] font-bold text-[#666]">源栏目（从这里移出）</span>
            <select
              className="mt-1 w-full border border-[#ddd] px-3 py-[8px] text-[13px] outline-none focus:border-[#e61d39]"
              onChange={(e) => setFromSourceId(e.target.value)}
              value={fromSourceId}
            >
              <option value="">请选择源栏目…</option>
              {options.map((c) => (
                <option key={c.sourceId} value={c.sourceId}>
                  {c.sectionName} / {c.name}（{c.itemCount} 条）
                </option>
              ))}
            </select>
            {from ? (
              <p className="mt-1 text-[11px] text-[#999]">
                sourceId: {from.sourceId} · 类型: {from.dbKind ?? from.dataSource} · 条目: {from.itemCount}
              </p>
            ) : null}
          </label>

          <div className="flex items-center justify-center pt-6 text-[20px] text-[#ccc]">→</div>

          <label className="block">
            <span className="text-[12px] font-bold text-[#666]">目标栏目（移到这里）</span>
            <select
              className="mt-1 w-full border border-[#ddd] px-3 py-[8px] text-[13px] outline-none focus:border-[#e61d39]"
              onChange={(e) => setToSourceId(e.target.value)}
              value={toSourceId}
            >
              <option value="">请选择目标栏目…</option>
              {options.map((c) => (
                <option key={c.sourceId} value={c.sourceId}>
                  {c.sectionName} / {c.name}（{c.itemCount} 条）
                </option>
              ))}
            </select>
            {to ? (
              <p className="mt-1 text-[11px] text-[#999]">
                sourceId: {to.sourceId} · 类型: {to.dbKind ?? to.dataSource} · 条目: {to.itemCount}
              </p>
            ) : null}
          </label>
        </div>

        {mode === "content" && from && to && !sameKind ? (
          <p className="mt-3 border border-[#ffe0b2] bg-[#fff8e6] px-3 py-2 text-[12px] text-[#9a6b00]">
            注意：源栏目类型（{from.dbKind}）与目标栏目类型（{to.dbKind}）不同。如果二者不属于兼容的列表类型，转移会被拒绝。
          </p>
        ) : null}

        {mode === "content" ? (
          <label className="mt-3 flex items-center gap-2 text-[12px] text-[#666]">
            <input checked={copy} onChange={(e) => setCopy(e.target.checked)} type="checkbox" />
            复制而非移动（保留源栏目的内容）
          </label>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            className="bg-[#e61d39] px-4 py-[9px] text-[12px] font-bold text-white disabled:opacity-40"
            disabled={busy || !fromSourceId || !toSourceId}
            onClick={() => void run()}
            type="button"
          >
            {busy ? "转移中…" : "执行转移"}
          </button>
          <button
            className="border border-[#ddd] px-4 py-[9px] text-[12px] text-[#666]"
            onClick={() => {
              setFromSourceId("");
              setToSourceId("");
              setNotice("");
              setResult("");
            }}
            type="button"
          >
            重置
          </button>
          {notice ? <span className="text-[12px] text-[#e61d39]">{notice}</span> : null}
        </div>
      </div>

      {result ? (
        <div className="mt-4 border border-[#e3e3e3] bg-white p-4">
          <h3 className="text-[13px] font-bold text-[#333]">快照（已同时写入留言板）</h3>
          <pre className="mt-2 max-h-[240px] overflow-auto bg-[#fafafa] p-3 text-[11px] leading-[18px] text-[#555]">
            {result}
          </pre>
        </div>
      ) : null}

      <div className="mt-4 border border-[#e3e3e3] bg-white">
        <div className="border-b border-[#eee] px-5 py-3">
          <h3 className="text-[13px] font-bold text-[#333]">可转移栏目一览</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[12px]">
            <thead className="bg-[#fafafa] text-[12px] text-[#888]">
              <tr>
                <th className="px-3 py-2">区块</th>
                <th className="px-3 py-2">栏目</th>
                <th className="px-3 py-2">sourceId</th>
                <th className="px-3 py-2">类型</th>
                <th className="px-3 py-2">数据源</th>
                <th className="px-3 py-2">条目数</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f0f0]">
              {columns.map((c) => (
                <tr key={c.sourceId}>
                  <td className="px-3 py-2 text-[#888]">{c.sectionName}</td>
                  <td className="px-3 py-2 text-[#333]">{c.name}</td>
                  <td className="px-3 py-2 font-mono text-[#999]">{c.sourceId}</td>
                  <td className="px-3 py-2 text-[#666]">{c.dbKind ?? "-"}</td>
                  <td className="px-3 py-2 text-[#666]">{c.dataSource}</td>
                  <td className="px-3 py-2 text-[#666]">{c.itemCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
