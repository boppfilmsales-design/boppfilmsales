"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type SettingRow = {
  id: number;
  key: string;
  value: string;
  label: string;
  groupName: string;
  updatedAt: string;
};

const GROUP_LABEL: Record<string, string> = {
  general: "基础信息",
  contact: "联系方式",
  footer: "页脚与备案",
  display: "展示与分页",
  custom: "自定义",
};

const GROUP_HINT: Record<string, string> = {
  general: "站点名称与标语，会出现在浏览器标题、页头与页脚。",
  contact: "前台「联系我们」页面与页脚展示的联系信息。",
  footer: "页脚版权与备案号，直接渲染在前台每个页面底部。",
  display: "前台列表分页条数与站点维护开关。",
  custom: "通过接口自行扩展的键值对。",
};

export default function SiteSettings() {
  const [rows, setRows] = useState<SettingRow[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/advanced/settings", { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setRows(data.rows ?? []);
      setDraft(Object.fromEntries((data.rows ?? []).map((r: SettingRow) => [r.key, r.value])));
      setError("");
    } catch (err) {
      setError(`加载站点设置失败：${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const groups = useMemo(() => {
    const map = new Map<string, SettingRow[]>();
    for (const row of rows) {
      const list = map.get(row.groupName) ?? [];
      list.push(row);
      map.set(row.groupName, list);
    }
    return [...map.entries()];
  }, [rows]);

  const dirty = rows.some((row) => (draft[row.key] ?? "") !== row.value);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/advanced/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: draft }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setNotice(`已保存 ${data.updated} 项设置，前台即时生效。`);
      void load();
    } catch (err) {
      setNotice(`保存失败：${(err as Error).message}`);
    } finally {
      setSaving(false);
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
      <div className="mb-4 flex flex-wrap items-center gap-3 border border-[#e3e3e3] bg-white p-4">
        <div>
          <h2 className="text-[16px] font-bold text-[#333]">站点设置</h2>
          <p className="mt-1 text-[12px] text-[#888]">共 {rows.length} 项配置，修改后前台页面即时生效。</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {notice ? <span className="text-[12px] text-[#e61d39]">{notice}</span> : null}
          <button
            className="border border-[#ddd] px-3 py-[7px] text-[12px] text-[#666] hover:border-[#bbb]"
            onClick={() => {
              setDraft(Object.fromEntries(rows.map((r) => [r.key, r.value])));
              setNotice("已撤销未保存的修改。");
            }}
            type="button"
          >
            撤销修改
          </button>
          <button
            className="bg-[#e61d39] px-4 py-[8px] text-[12px] font-bold text-white disabled:opacity-40"
            disabled={!dirty || saving}
            onClick={() => void save()}
            type="button"
          >
            {saving ? "保存中…" : "保存全部"}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {groups.map(([group, list]) => (
          <div className="border border-[#e3e3e3] bg-white" key={group}>
            <div className="border-b border-[#eee] px-5 py-3">
              <h3 className="text-[14px] font-bold text-[#333]">{GROUP_LABEL[group] ?? group}</h3>
              <p className="mt-1 text-[11px] text-[#999]">{GROUP_HINT[group] ?? "自定义配置项。"}</p>
            </div>
            <div className="divide-y divide-[#f0f0f0]">
              {list.map((row) => {
                const isLong = row.key.includes("address") || row.key.includes("notice") || row.key.includes("copyright");
                const changed = (draft[row.key] ?? "") !== row.value;
                return (
                  <div className="flex flex-wrap items-start gap-3 px-5 py-3" key={row.key}>
                    <div className="w-[240px] shrink-0 pt-[6px]">
                      <p className="text-[13px] font-bold text-[#333]">{row.label || row.key}</p>
                      <p className="mt-1 font-mono text-[10px] text-[#aaa]">{row.key}</p>
                    </div>
                    <div className="min-w-[260px] flex-1">
                      {isLong ? (
                        <textarea
                          className={`w-full border px-3 py-[7px] text-[13px] outline-none focus:border-[#e61d39] ${
                            changed ? "border-[#e6a23c] bg-[#fffbf0]" : "border-[#ddd]"
                          }`}
                          onChange={(e) => setDraft((d) => ({ ...d, [row.key]: e.target.value }))}
                          rows={2}
                          value={draft[row.key] ?? ""}
                        />
                      ) : (
                        <input
                          className={`w-full border px-3 py-[7px] text-[13px] outline-none focus:border-[#e61d39] ${
                            changed ? "border-[#e6a23c] bg-[#fffbf0]" : "border-[#ddd]"
                          }`}
                          onChange={(e) => setDraft((d) => ({ ...d, [row.key]: e.target.value }))}
                          value={draft[row.key] ?? ""}
                        />
                      )}
                      {changed ? (
                        <p className="mt-1 text-[11px] text-[#e6a23c]">未保存（原值：{row.value || "空"}）</p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
