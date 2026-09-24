"use client";

import { useCallback, useEffect, useState } from "react";

type RoleRow = {
  id: number;
  key: string;
  name: string;
  nameZh: string;
  description: string;
  permissionsJson: string;
  isBuiltIn: boolean;
  memberCount: number;
};

/** The permission chips surfaced in the editor, keyed by section pid / slug. */
const PERMISSION_OPTIONS: { key: string; label: string }[] = [
  { key: "about", label: "关于我们" },
  { key: "product", label: "产品展示" },
  { key: "news", label: "新闻中心" },
  { key: "download", label: "下载中心" },
  { key: "case", label: "案例" },
  { key: "service", label: "服务" },
  { key: "other", label: "其他" },
  { key: "contact", label: "联系我们" },
  { key: "inquiry", label: "询盘管理" },
  { key: "message", label: "留言板" },
  { key: "settings", label: "站点设置" },
  { key: "transfer", label: "信息转移" },
];

function parsePermissions(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

const emptyForm = { id: 0, key: "", name: "", nameZh: "", description: "", permissions: [] as string[] };

export default function RoleManager() {
  const [rows, setRows] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/advanced/roles", { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setRows(data.rows ?? []);
      setError("");
    } catch (err) {
      setError(`加载角色失败：${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit() {
    if (!form.name.trim()) {
      setNotice("请填写角色名称。");
      return;
    }
    const payload = {
      id: form.id || undefined,
      key: form.key || undefined,
      name: form.name,
      nameZh: form.nameZh,
      description: form.description,
      permissions: form.permissions,
    };
    const res = await fetch("/api/admin/advanced/roles", {
      method: form.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.ok) {
      setNotice(data.error ?? "保存失败");
      return;
    }
    setNotice(form.id ? "角色已更新。" : "角色已创建。");
    setForm(emptyForm);
    setCreating(false);
    void load();
  }

  async function remove(row: RoleRow) {
    if (!window.confirm(`确定删除角色「${row.name}」吗？`)) return;
    const res = await fetch("/api/admin/advanced/roles", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: row.id }),
    });
    const data = await res.json();
    setNotice(data.ok ? "角色已删除。" : (data.error ?? "删除失败"));
    if (data.ok) void load();
  }

  function togglePermission(key: string) {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(key)
        ? f.permissions.filter((p) => p !== key)
        : [...f.permissions, key],
    }));
  }

  if (loading) {
    return <div className="border border-[#e3e3e3] bg-white py-16 text-center text-[13px] text-[#888]">加载中…</div>;
  }

  return (
    <div>
      {error ? <div className="mb-4 border border-red-300 bg-red-50 p-5 text-[13px] text-red-700">{error}</div> : null}

      {creating || form.id ? (
        <div className="mb-4 border border-[#e3e3e3] bg-white p-5">
          <h2 className="text-[16px] font-bold text-[#333]">{form.id ? `编辑角色：${form.name}` : "新建角色"}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-[12px] text-[#888]">角色名称（英文）</span>
              <input
                className="mt-1 w-full border border-[#ddd] px-3 py-[7px] text-[13px] outline-none focus:border-[#e61d39]"
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                value={form.name}
              />
            </label>
            <label className="block">
              <span className="text-[12px] text-[#888]">角色名称（中文）</span>
              <input
                className="mt-1 w-full border border-[#ddd] px-3 py-[7px] text-[13px] outline-none focus:border-[#e61d39]"
                onChange={(e) => setForm((f) => ({ ...f, nameZh: e.target.value }))}
                value={form.nameZh}
              />
            </label>
            {!form.id ? (
              <label className="block">
                <span className="text-[12px] text-[#888]">标识 key（留空自动生成）</span>
                <input
                  className="mt-1 w-full border border-[#ddd] px-3 py-[7px] font-mono text-[12px] outline-none focus:border-[#e61d39]"
                  onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
                  placeholder="例如 sales-manager"
                  value={form.key}
                />
              </label>
            ) : null}
            <label className="block sm:col-span-2">
              <span className="text-[12px] text-[#888]">角色说明</span>
              <input
                className="mt-1 w-full border border-[#ddd] px-3 py-[7px] text-[13px] outline-none focus:border-[#e61d39]"
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                value={form.description}
              />
            </label>
          </div>

          <div className="mt-4">
            <p className="text-[12px] text-[#888]">
              可访问模块
              {form.key === "owner" || (form.id > 0 && rows.find((r) => r.id === form.id)?.key === "owner")
                ? "（超级管理员固定拥有全部权限）"
                : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {PERMISSION_OPTIONS.map((opt) => {
                const active = form.permissions.includes(opt.key);
                return (
                  <button
                    className={`border px-3 py-[5px] text-[12px] ${
                      active
                        ? "border-[#e61d39] bg-[#e61d39] font-bold text-white"
                        : "border-[#ddd] bg-white text-[#666] hover:border-[#bbb]"
                    }`}
                    key={opt.key}
                    onClick={() => togglePermission(opt.key)}
                    type="button"
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              className="bg-[#e61d39] px-4 py-[8px] text-[12px] font-bold text-white"
              onClick={() => void submit()}
              type="button"
            >
              保存角色
            </button>
            <button
              className="border border-[#ddd] px-4 py-[8px] text-[12px] text-[#666]"
              onClick={() => {
                setForm(emptyForm);
                setCreating(false);
              }}
              type="button"
            >
              取消
            </button>
            {notice ? <span className="text-[12px] text-[#e61d39]">{notice}</span> : null}
          </div>
        </div>
      ) : (
        <div className="mb-4 flex items-center gap-3 border border-[#e3e3e3] bg-white p-4">
          <div>
            <h2 className="text-[16px] font-bold text-[#333]">角色管理</h2>
            <p className="mt-1 text-[12px] text-[#888]">
              共 {rows.length} 个角色。内置角色不可删除，但可调整可访问模块。
            </p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {notice ? <span className="text-[12px] text-[#e61d39]">{notice}</span> : null}
            <button
              className="bg-[#e61d39] px-4 py-[8px] text-[12px] font-bold text-white"
              onClick={() => {
                setForm(emptyForm);
                setCreating(true);
              }}
              type="button"
            >
              + 新建角色
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto border border-[#e3e3e3] bg-white">
        <table className="w-full min-w-[900px] text-left text-[13px]">
          <thead className="bg-[#fafafa] text-[12px] text-[#888]">
            <tr>
              <th className="px-3 py-3">ID</th>
              <th className="px-3 py-3">角色名称</th>
              <th className="px-3 py-3">标识</th>
              <th className="px-3 py-3">可访问模块</th>
              <th className="px-3 py-3">管理员数</th>
              <th className="px-3 py-3">类型</th>
              <th className="px-3 py-3">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eee]">
            {rows.map((row) => {
              const perms = parsePermissions(row.permissionsJson);
              const isWildcard = perms.includes("*");
              return (
                <tr className="align-top" key={row.id}>
                  <td className="px-3 py-3 text-[#999]">{row.id}</td>
                  <td className="px-3 py-3">
                    <span className="font-bold text-[#333]">{row.name}</span>
                    {row.nameZh ? <p className="mt-1 text-[11px] text-[#888]">{row.nameZh}</p> : null}
                    {row.description ? <p className="mt-1 max-w-[280px] text-[11px] text-[#aaa]">{row.description}</p> : null}
                  </td>
                  <td className="px-3 py-3 font-mono text-[11px] text-[#666]">{row.key}</td>
                  <td className="px-3 py-3">
                    {isWildcard ? (
                      <span className="bg-[#e6f6ea] px-2 py-[3px] text-[11px] font-bold text-[#1c7c39]">全部权限</span>
                    ) : perms.length === 0 ? (
                      <span className="bg-[#f4f4f4] px-2 py-[3px] text-[11px] text-[#888]">只读</span>
                    ) : (
                      <div className="flex max-w-[320px] flex-wrap gap-1">
                        {perms.map((p) => (
                          <span className="bg-[#f4f4f4] px-2 py-[2px] text-[10px] text-[#666]" key={p}>
                            {PERMISSION_OPTIONS.find((o) => o.key === p)?.label ?? p}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 text-[#666]">{row.memberCount}</td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-[3px] text-[11px] font-bold ${row.isBuiltIn ? "bg-[#eef4ff] text-[#1c6dd0]" : "bg-[#f4f4f4] text-[#888]"}`}>
                      {row.isBuiltIn ? "内置" : "自定义"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <button
                      className="mr-3 text-[12px] text-[#1c6dd0] hover:underline"
                      onClick={() => {
                        setForm({
                          id: row.id,
                          key: row.key,
                          name: row.name,
                          nameZh: row.nameZh,
                          description: row.description,
                          permissions: isWildcard ? PERMISSION_OPTIONS.map((o) => o.key) : perms,
                        });
                        setCreating(false);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      type="button"
                    >
                      编辑
                    </button>
                    <button
                      className="text-[12px] text-[#e61d39] hover:underline disabled:text-[#ccc] disabled:no-underline"
                      disabled={row.isBuiltIn}
                      onClick={() => void remove(row)}
                      type="button"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td className="py-8 text-center text-[13px] text-[#888]" colSpan={7}>
                  暂无角色，点击右上角新建。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
