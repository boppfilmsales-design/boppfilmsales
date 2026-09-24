"use client";

import { useCallback, useEffect, useState } from "react";

type UserRow = {
  id: number;
  username: string;
  displayName: string;
  roleKey: string;
  roleName: string;
  roleNameZh: string;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
};

type RoleOption = { key: string; name: string; nameZh: string; permissionsJson: string };

const emptyForm = {
  id: 0,
  username: "",
  displayName: "",
  roleKey: "editor",
  status: "active",
  password: "",
};

export default function AdminUsers({ currentUser }: { currentUser: string }) {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/advanced/users", { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setRows(data.rows ?? []);
      setRoles(data.roles ?? []);
      setError("");
    } catch (err) {
      setError(`加载管理员失败：${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit() {
    if (!form.id && !form.username.trim()) {
      setNotice("请填写管理员账号。");
      return;
    }
    if (!form.id && form.password.length < 6) {
      setNotice("密码至少 6 位。");
      return;
    }
    const payload: Record<string, unknown> = {
      id: form.id || undefined,
      displayName: form.displayName,
      roleKey: form.roleKey,
      status: form.status,
    };
    if (!form.id) payload.username = form.username;
    if (form.password) payload.password = form.password;

    const res = await fetch("/api/admin/advanced/users", {
      method: form.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.ok) {
      setNotice(data.error ?? "保存失败");
      return;
    }
    setNotice(form.id ? "管理员已更新。" : "管理员已创建。");
    setForm(emptyForm);
    setCreating(false);
    void load();
  }

  async function remove(row: UserRow) {
    if (!window.confirm(`确定删除管理员「${row.username}」吗？该操作不可恢复。`)) return;
    const res = await fetch("/api/admin/advanced/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: row.id }),
    });
    const data = await res.json();
    setNotice(data.ok ? "管理员已删除。" : (data.error ?? "删除失败"));
    if (data.ok) void load();
  }

  async function toggleStatus(row: UserRow) {
    const next = row.status === "active" ? "disabled" : "active";
    const res = await fetch("/api/admin/advanced/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: row.id, status: next }),
    });
    const data = await res.json();
    setNotice(data.ok ? (next === "active" ? "账号已启用。" : "账号已停用。") : (data.error ?? "操作失败"));
    if (data.ok) void load();
  }

  if (loading) {
    return <div className="border border-[#e3e3e3] bg-white py-16 text-center text-[13px] text-[#888]">加载中…</div>;
  }

  return (
    <div>
      {error ? <div className="mb-4 border border-red-300 bg-red-50 p-5 text-[13px] text-red-700">{error}</div> : null}

      {creating || form.id ? (
        <div className="mb-4 border border-[#e3e3e3] bg-white p-5">
          <h2 className="text-[16px] font-bold text-[#333]">
            {form.id ? `编辑管理员：${form.username}` : "新增管理员"}
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-[12px] text-[#888]">登录账号</span>
              <input
                className="mt-1 w-full border border-[#ddd] px-3 py-[7px] text-[13px] outline-none focus:border-[#e61d39] disabled:bg-[#f8f8f8] disabled:text-[#999]"
                disabled={Boolean(form.id)}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                placeholder="字母、数字、_ . @ -"
                value={form.username}
              />
            </label>
            <label className="block">
              <span className="text-[12px] text-[#888]">显示名称</span>
              <input
                className="mt-1 w-full border border-[#ddd] px-3 py-[7px] text-[13px] outline-none focus:border-[#e61d39]"
                onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                placeholder="例如：张伟"
                value={form.displayName}
              />
            </label>
            <label className="block">
              <span className="text-[12px] text-[#888]">所属角色</span>
              <select
                className="mt-1 w-full border border-[#ddd] px-3 py-[7px] text-[13px] outline-none focus:border-[#e61d39]"
                onChange={(e) => setForm((f) => ({ ...f, roleKey: e.target.value }))}
                value={form.roleKey}
              >
                {roles.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.nameZh || r.name}（{r.key}）
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[12px] text-[#888]">账号状态</span>
              <select
                className="mt-1 w-full border border-[#ddd] px-3 py-[7px] text-[13px] outline-none focus:border-[#e61d39]"
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                value={form.status}
              >
                <option value="active">启用</option>
                <option value="disabled">停用</option>
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="text-[12px] text-[#888]">
                {form.id ? "重置密码（留空表示不修改）" : "登录密码（至少 6 位）"}
              </span>
              <input
                autoComplete="new-password"
                className="mt-1 w-full border border-[#ddd] px-3 py-[7px] text-[13px] outline-none focus:border-[#e61d39]"
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                type="password"
                value={form.password}
              />
            </label>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              className="bg-[#e61d39] px-4 py-[8px] text-[12px] font-bold text-white"
              onClick={() => void submit()}
              type="button"
            >
              保存
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
            <h2 className="text-[16px] font-bold text-[#333]">管理员</h2>
            <p className="mt-1 text-[12px] text-[#888]">
              共 {rows.length} 个账号，当前登录：{currentUser}。密码使用 scrypt 加盐存储。
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
              + 新增管理员
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto border border-[#e3e3e3] bg-white">
        <table className="w-full min-w-[900px] text-left text-[13px]">
          <thead className="bg-[#fafafa] text-[12px] text-[#888]">
            <tr>
              <th className="px-3 py-3">ID</th>
              <th className="px-3 py-3">账号</th>
              <th className="px-3 py-3">角色</th>
              <th className="px-3 py-3">状态</th>
              <th className="px-3 py-3">最后登录</th>
              <th className="px-3 py-3">创建时间</th>
              <th className="px-3 py-3">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eee]">
            {rows.map((row) => (
              <tr className="align-top" key={row.id}>
                <td className="px-3 py-3 text-[#999]">{row.id}</td>
                <td className="px-3 py-3">
                  <span className="font-bold text-[#333]">{row.username}</span>
                  {row.displayName ? <p className="mt-1 text-[11px] text-[#888]">{row.displayName}</p> : null}
                  {row.username === currentUser ? (
                    <span className="mt-1 inline-block bg-[#eef4ff] px-2 py-[2px] text-[10px] font-bold text-[#1c6dd0]">
                      当前登录
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-3 text-[#666]">
                  {row.roleNameZh || row.roleName}
                  <span className="ml-1 font-mono text-[10px] text-[#aaa]">{row.roleKey}</span>
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`px-2 py-[3px] text-[11px] font-bold ${
                      row.status === "active" ? "bg-[#e6f6ea] text-[#1c7c39]" : "bg-[#f4f4f4] text-[#888]"
                    }`}
                  >
                    {row.status === "active" ? "启用" : "停用"}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-[#666]">
                  {row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleString() : "从未登录"}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-[#999]">
                  {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "-"}
                </td>
                <td className="whitespace-nowrap px-3 py-3">
                  <button
                    className="mr-3 text-[12px] text-[#1c6dd0] hover:underline"
                    onClick={() => {
                      setForm({
                        id: row.id,
                        username: row.username,
                        displayName: row.displayName,
                        roleKey: row.roleKey,
                        status: row.status,
                        password: "",
                      });
                      setCreating(false);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    type="button"
                  >
                    编辑
                  </button>
                  <button
                    className="mr-3 text-[12px] text-[#666] hover:underline"
                    onClick={() => void toggleStatus(row)}
                    type="button"
                  >
                    {row.status === "active" ? "停用" : "启用"}
                  </button>
                  <button
                    className="text-[12px] text-[#e61d39] hover:underline disabled:text-[#ccc] disabled:no-underline"
                    disabled={row.username === currentUser}
                    onClick={() => void remove(row)}
                    type="button"
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="py-8 text-center text-[13px] text-[#888]" colSpan={7}>
                  暂无管理员账号。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
