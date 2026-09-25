"use client";

import { useSyncExternalStore, useState } from "react";

const REMEMBER_KEY = "apig_admin_remember";

type Remembered = { username: string; password: string };

/**
 * Module-level cache. `getSnapshot` must return a referentially stable value
 * across calls or useSyncExternalStore re-renders forever.
 *   undefined = not read yet, null = nothing remembered.
 */
let cached: Remembered | null | undefined;

function readRemembered(): Remembered | null {
  if (cached !== undefined) return cached;
  cached = null;
  try {
    const raw = window.localStorage.getItem(REMEMBER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Remembered>;
      if (parsed.username && parsed.password) {
        cached = { username: parsed.username, password: parsed.password };
      }
    }
  } catch {
    // Corrupted entry or blocked storage — behave as if nothing was remembered.
  }
  return cached;
}

// We read localStorage once, so there is nothing to subscribe to.
const subscribe = () => () => {};
// The server has no localStorage: render empty inputs so hydration matches,
// then React swaps in the client snapshot right after hydration.
const getServerSnapshot = () => null;

export default function LoginForm() {
  const remembered = useSyncExternalStore(subscribe, readRemembered, getServerSnapshot);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const username = String(data.get("username") ?? "").trim();
    const password = String(data.get("password") ?? "");
    setBusy(true);
    setError("");
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, remember }),
    });
    const result = (await response.json()) as { ok?: boolean; error?: string };
    setBusy(false);
    if (!response.ok || !result.ok) {
      setError(result.error ?? "登录失败");
      return;
    }
    // Persist only once the credentials are proven correct, so a mistyped
    // password is never written to localStorage.
    try {
      if (remember) {
        window.localStorage.setItem(REMEMBER_KEY, JSON.stringify({ username, password }));
      } else {
        window.localStorage.removeItem(REMEMBER_KEY);
      }
    } catch {
      // Storage may be blocked (private mode / disabled cookies). Non-fatal:
      // the API has already set the session cookie.
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
            defaultValue={remembered?.username ?? ""}
            // Remount once the remembered values arrive after hydration, so the
            // uncontrolled inputs actually pick up defaultValue.
            key={remembered ? "saved" : "empty"}
            name="username"
          />
        </label>
        <label className="mt-4 block text-[13px] font-bold text-[#555]">
          密码
          <input
            autoComplete="current-password"
            className="mt-2 w-full border border-[#ddd] px-3 py-[10px] text-[13px] outline-none focus:border-[#e61d39]"
            defaultValue={remembered?.password ?? ""}
            key={remembered ? "saved" : "empty"}
            name="password"
            type="password"
          />
        </label>
        <label className="mt-4 flex cursor-pointer select-none items-center gap-2 text-[13px] text-[#555]">
          <input
            checked={remember}
            className="h-[15px] w-[15px] accent-[#e61d39]"
            onChange={(event) => setRemember(event.target.checked)}
            type="checkbox"
          />
          记住密码（30 天内免登录）
        </label>
        {remembered ? (
          <p className="mt-2 text-[12px] text-[#2b8a3e]">
            已自动填入上次记住的账号密码，直接点登录即可。
          </p>
        ) : null}
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
