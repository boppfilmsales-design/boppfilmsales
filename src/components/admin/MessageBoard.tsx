"use client";

import { useCallback, useEffect, useState } from "react";

type MsgRow = {
  id: number;
  author: string;
  title: string;
  body: string;
  sectionPid: number | null;
  columnSourceId: number | null;
  status: string;
  reply: string;
  repliedBy: string;
  repliedAt: string | null;
  isPinned: boolean;
  createdAt: string;
};

type Counts = { all: number; open: number; replied: number; closed: number };

const STATUS_LABEL: Record<string, string> = {
  open: "待处理",
  replied: "已回复",
  closed: "已归档",
};

const STATUS_CLASS: Record<string, string> = {
  open: "bg-[#fff5d6] text-[#9a6b00]",
  replied: "bg-[#e6f6ea] text-[#1c7c39]",
  closed: "bg-[#f4f4f4] text-[#888]",
};

export default function MessageBoard({ username }: { username: string }) {
  const [rows, setRows] = useState<MsgRow[]>([]);
  const [counts, setCounts] = useState<Counts>({ all: 0, open: 0, replied: 0, closed: 0 });
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});

  const load = useCallback(async (status: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/advanced/messages?status=${encodeURIComponent(status)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setRows(data.rows ?? []);
      if (data.counts) setCounts(data.counts);
      setError("");
    } catch (err) {
      setError(`加载留言失败：${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(filter);
  }, [filter, load]);

  async function submit() {
    if (!body.trim()) {
      setNotice("留言内容不能为空。");
      return;
    }
    const res = await fetch("/api/admin/advanced/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body }),
    });
    const data = await res.json();
    if (!data.ok) {
      setNotice(data.error ?? "发布失败");
      return;
    }
    setTitle("");
    setBody("");
    setNotice("留言已发布。");
    void load(filter);
  }

  async function patch(id: number, payload: Record<string, unknown>, okMsg: string) {
    const res = await fetch("/api/admin/advanced/messages", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...payload }),
    });
    const data = await res.json();
    setNotice(data.ok ? okMsg : (data.error ?? "操作失败"));
    if (data.ok) void load(filter);
  }

  async function remove(id: number) {
    if (!window.confirm("确定删除这条留言吗？该操作不可恢复。")) return;
    const res = await fetch("/api/admin/advanced/messages", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    setNotice(data.ok ? "留言已删除。" : (data.error ?? "删除失败"));
    if (data.ok) void load(filter);
  }

  return (
    <div>
      <div className="mb-4 border border-[#e3e3e3] bg-white p-5">
        <h2 className="text-[16px] font-bold text-[#333]">发布新留言</h2>
        <p className="mt-1 text-[12px] text-[#888]">
          留言板用于运营人员之间沟通栏目维护事项，发布后会记录当前登录账号（{username}）。
        </p>
        <input
          className="mt-3 w-full border border-[#ddd] px-3 py-[8px] text-[13px] outline-none focus:border-[#e61d39]"
          onChange={(e) => setTitle(e.target.value)}
          placeholder="留言标题（可留空）"
          value={title}
        />
        <textarea
          className="mt-2 w-full border border-[#ddd] px-3 py-[8px] text-[13px] outline-none focus:border-[#e61d39]"
          onChange={(e) => setBody(e.target.value)}
          placeholder="留言内容，支持多行"
          rows={4}
          value={body}
        />
        <div className="mt-2 flex items-center gap-3">
          <button
            className="bg-[#e61d39] px-4 py-[8px] text-[12px] font-bold text-white"
            onClick={() => void submit()}
            type="button"
          >
            发布留言
          </button>
          {notice ? <span className="text-[12px] text-[#e61d39]">{notice}</span> : null}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(
          [
            ["all", `全部 ${counts.all}`],
            ["open", `待处理 ${counts.open}`],
            ["replied", `已回复 ${counts.replied}`],
            ["closed", `已归档 ${counts.closed}`],
          ] as const
        ).map(([key, label]) => (
          <button
            className={`border px-3 py-[6px] text-[12px] ${
              filter === key
                ? "border-[#e61d39] bg-[#e61d39] font-bold text-white"
                : "border-[#ddd] bg-white text-[#666] hover:border-[#bbb]"
            }`}
            key={key}
            onClick={() => setFilter(key)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="mb-3 border border-red-300 bg-red-50 p-4 text-[13px] text-red-700">{error}</div>
      ) : null}

      <div className="space-y-3">
        {loading ? (
          <div className="border border-[#e3e3e3] bg-white py-12 text-center text-[13px] text-[#888]">
            加载中…
          </div>
        ) : rows.length === 0 ? (
          <div className="border border-[#e3e3e3] bg-white py-12 text-center text-[13px] text-[#888]">
            该分类下暂无留言。
          </div>
        ) : (
          rows.map((row) => (
            <div className="border border-[#e3e3e3] bg-white p-4" key={row.id}>
              <div className="flex flex-wrap items-center gap-2">
                {row.isPinned ? (
                  <span className="bg-[#e61d39] px-2 py-[2px] text-[10px] font-bold text-white">置顶</span>
                ) : null}
                <span className="text-[14px] font-bold text-[#333]">{row.title}</span>
                <span className={`px-2 py-[2px] text-[10px] font-bold ${STATUS_CLASS[row.status] ?? ""}`}>
                  {STATUS_LABEL[row.status] ?? row.status}
                </span>
                <span className="ml-auto text-[11px] text-[#999]">
                  {row.author} · {new Date(row.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-[13px] leading-[22px] text-[#555]">{row.body}</p>

              {row.reply ? (
                <div className="mt-3 border-l-[3px] border-[#1c7c39] bg-[#f6fbf7] px-3 py-2">
                  <p className="text-[11px] text-[#1c7c39]">
                    回复 · {row.repliedBy || "system"}
                    {row.repliedAt ? ` · ${new Date(row.repliedAt).toLocaleString()}` : ""}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-[12px] text-[#444]">{row.reply}</p>
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  className="min-w-[240px] flex-1 border border-[#ddd] px-3 py-[6px] text-[12px] outline-none focus:border-[#e61d39]"
                  onChange={(e) => setReplyDrafts((d) => ({ ...d, [row.id]: e.target.value }))}
                  placeholder="回复内容…"
                  value={replyDrafts[row.id] ?? ""}
                />
                <button
                  className="border border-[#1c7c39] px-3 py-[6px] text-[12px] text-[#1c7c39] hover:bg-[#1c7c39] hover:text-white"
                  onClick={() => {
                    const reply = (replyDrafts[row.id] ?? "").trim();
                    if (!reply) {
                      setNotice("回复内容不能为空。");
                      return;
                    }
                    void patch(row.id, { reply }, "回复已提交。");
                    setReplyDrafts((d) => ({ ...d, [row.id]: "" }));
                  }}
                  type="button"
                >
                  回复
                </button>
                <button
                  className="border border-[#ddd] px-3 py-[6px] text-[12px] text-[#666] hover:border-[#bbb]"
                  onClick={() => void patch(row.id, { isPinned: !row.isPinned }, row.isPinned ? "已取消置顶。" : "已置顶。")}
                  type="button"
                >
                  {row.isPinned ? "取消置顶" : "置顶"}
                </button>
                {row.status !== "closed" ? (
                  <button
                    className="border border-[#ddd] px-3 py-[6px] text-[12px] text-[#666] hover:border-[#bbb]"
                    onClick={() => void patch(row.id, { status: "closed" }, "已归档。")}
                    type="button"
                  >
                    归档
                  </button>
                ) : (
                  <button
                    className="border border-[#ddd] px-3 py-[6px] text-[12px] text-[#666] hover:border-[#bbb]"
                    onClick={() => void patch(row.id, { status: "open" }, "已重新打开。")}
                    type="button"
                  >
                    重新打开
                  </button>
                )}
                <button
                  className="border border-[#f0c2cb] px-3 py-[6px] text-[12px] text-[#e61d39] hover:bg-[#e61d39] hover:text-white"
                  onClick={() => void remove(row.id)}
                  type="button"
                >
                  删除
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
