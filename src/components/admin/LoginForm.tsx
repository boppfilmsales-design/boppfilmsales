"use client";

import { useState } from "react";

export default function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = (await response.json()) as { ok?: boolean; error?: string };
    setBusy(false);
    if (!response.ok || !data.ok) {
      setError(data.error ?? "登录失败");
      return;
    }
    // Full page reload instead of router.refresh() to guarantee the server
    // re-renders with the new session cookie (RSC refresh can be unreliable
    // on Cloudflare Workers edge runtime).
    window.location.href = "/admin";
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f5f7] px-4">
      <form
        className="w-full max-w-[400px] border-t-4 border-[#e61d39] bg-white p-8 shadow-sm"
        onSubmit={submit}
      >
        <h1 className="text-[20px] font-bold text-[#333]">XgxCms 后台登录</h1>
        <p className="mt-1 text-[12px] text-[#888]">
          Asia Pacific Industry Group Co., Limited
        </p>
        <label className="mt-6 block text-[13px] font-bold text-[#555]">
          用户名
          <input
            autoComplete="username"
            className="mt-2 w-full border border-[#ddd] px-3 py-[10px] text-[13px] outline-none focus:border-[#e61d39]"
            onChange={(event) => setUsername(event.target.value)}
            value={username}
          />
        </label>
        <label className="mt-4 block text-[13px] font-bold text-[#555]">
          密码
          <input
            autoComplete="current-password"
            className="mt-2 w-full border border-[#ddd] px-3 py-[10px] text-[13px] outline-none focus:border-[#e61d39]"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
        </label>
        {error ? <p className="mt-3 text-[12px] text-[#e61d39]">{error}</p> : null}
        <button
          className="mt-6 w-full bg-[#e61d39] py-[11px] text-[13px] font-bold uppercase text-white disabled:opacity-60"
          disabled={busy}
          type="submit"
        >
          {busy ? "登录中..." : "登录"}
        </button>
      </form>
    </div>
  );
}
