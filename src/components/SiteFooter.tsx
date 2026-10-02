import Link from "next/link";
import { getFriendlyLinks } from "@/lib/friendly-links";
import { getSiteSettings, setting } from "@/lib/site-settings";

/**
 * 版权年份自动跟随系统时间。
 *
 * 站点设置里的 `footer_copyright` 存的是固定文本（例如
 * "© 2026 Asia Pacific Industry Group All rights reserved."），年份写死会让
 * 2027 年之后一直显示旧年份。这里在渲染时把 © / (c) / Copyright / 版权所有
 * 后面紧邻的四位年份换成当前年份，其它数字一概不动。
 *
 * 因为页脚是服务端组件、页面又是 revalidate=60 的增量缓存，跨年当天最多
 * 一分钟后就会自动显示新年份，不需要改数据库、也不需要重新部署。
 */
function withCurrentYear(text: string): string {
  if (!text) return text;
  const year = String(new Date().getFullYear());
  return text.replace(
    /((?:©|\(c\)|Copyright|版权所有)\s*)(\d{4})/gi,
    (_match, prefix: string) => `${prefix}${year}`,
  );
}

/**
 * Async server component: the contact block and the copyright line are driven
 * by 高级管理 → 系统管理 → 站点设置, so an operator can change them without a
 * redeploy. `getSiteSettings()` never throws — it falls back to the built-in
 * defaults when the database is unavailable.
 */
export default async function SiteFooter() {
  const settings = await getSiteSettings();
  const friendlyLinks = await getFriendlyLinks();
  const address = setting(settings, "contact_address");
  const phone = setting(settings, "contact_phone");
  const mobile = setting(settings, "contact_mobile");
  // `contact_email` may hold several addresses separated by commas/semicolons;
  // each one is rendered as its own mailto link so the footer can show both
  // admin@… and sales@… without a second setting.
  const emails = setting(settings, "contact_email")
    .split(/[,;\n]+/)
    .map((e) => e.trim())
    .filter(Boolean);
  const copyright = withCurrentYear(setting(settings, "footer_copyright"));
  const beian = setting(settings, "footer_beian");
  return (
    <>
      <footer className="mt-16 bg-[#c8102e] py-10 text-white">
        <div className="mx-auto grid w-full max-w-[1560px] gap-8 px-3 md:grid-cols-4">

          {/* 第一列：Link */}
          <dl>
            <dt className="mb-[10px] text-[18px] font-bold">Link</dt>
            {friendlyLinks.map((l) => (
              <dd className="text-[12px] leading-[26px]" key={l.label}>
                <a
                  className="transition-colors hover:text-[#f2d66c] hover:underline"
                  href={l.href}
                  rel="noreferrer"
                  target={l.href.startsWith("http") ? "_blank" : "_self"}
                >
                  {l.label}
                </a>
              </dd>
            ))}
          </dl>

          {/* 第二列：Product categories */}
          <dl>
            <dt className="mb-[10px] flex items-center gap-2 text-[18px] font-bold">
              <span className="inline-block h-[6px] w-[6px] rotate-45 bg-[#f2d66c]" />
              Product categories
            </dt>
            {[
              "BOPET Film (Polyester Film)",
              "BOPP Film (Polypropylene film)",
              "BOPP Packing Tape Jumbo Rolls",
              "BOPP/BOPET Thermal Laminating Film coated EVA",
              "POF Shrink Film (Polyolefin)",
              "BOPS Window Envelope Film",
            ].map((p) => (
              <dd className="text-[12px] leading-[26px]" key={p}>
                <Link className="transition-colors hover:text-[#f2d66c] hover:underline" href="/products">
                  {p}
                </Link>
              </dd>
            ))}
          </dl>

          {/* 第三列：Enterprise information (带圆标图标) */}
          <dl>
            <dt className="mb-[10px] flex items-center gap-2 text-[18px] font-bold">
              <span className="inline-block h-[6px] w-[6px] rotate-45 bg-[#f2d66c]" />
              Enterprise information
            </dt>

            <dd className="flex items-center gap-2.5 text-[12px] leading-[30px]">
              <span className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-[#00aff0] text-[11px] font-bold text-white shadow ring-1 ring-[#f2d66c]/50">
                S
              </span>
              <span>Skype: asiapacificsale</span>
            </dd>

            <dd className="flex items-center gap-2.5 text-[12px] leading-[30px]">
              <span className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-[#12b7f5] text-[10px] font-bold text-white shadow ring-1 ring-[#f2d66c]/50">
                QQ
              </span>
              <span>QQ: 840715367</span>
            </dd>

            <dd className="flex items-center gap-2.5 text-[12px] leading-[30px]">
              <span className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-[#07c160] text-[9px] font-bold text-white shadow ring-1 ring-[#f2d66c]/50">
                微信
              </span>
              <span>WhatsApp: 86-18919654871</span>
            </dd>

            <dd className="flex items-center gap-2.5 text-[12px] leading-[30px]">
              <span className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-[#25d366] text-[10px] font-bold text-white shadow ring-1 ring-[#f2d66c]/50">
                📞
              </span>
              <span>Tel: 86-551-64687285</span>
            </dd>
          </dl>

          {/* 第四列：Contact us (带地址、电话、邮件图标) */}
          <dl>
            <dt className="mb-[10px] flex items-center gap-2 text-[18px] font-bold">
              <span className="inline-block h-[6px] w-[6px] rotate-45 bg-[#f2d66c]" />
              Contact us
            </dt>

            <dd className="mb-2 flex items-start gap-2.5 text-[13px] leading-[22px]">
              <span className="mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-[#f2d66c] text-[11px] text-[#c8102e] shadow">
                📍
              </span>
              <span>{address}</span>
            </dd>

            <dd className="flex items-center gap-2.5 text-[13px] leading-[26px]">
              <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-[#f2d66c] text-[11px] text-[#c8102e] shadow">
                ☎
              </span>
              <span>Tel: {phone}</span>
            </dd>

            <dd className="flex items-center gap-2.5 text-[13px] leading-[26px]">
              <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-[#f2d66c] text-[11px] text-[#c8102e] shadow">
                📱
              </span>
              <span>Mobile/WhatsApp: {mobile}</span>
            </dd>

            <dd className="flex items-start gap-2.5 text-[13px] leading-[26px]">
              <span className="mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-[#f2d66c] text-[10px] text-[#c8102e] shadow">
                ✉
              </span>
              <span className="flex flex-col">
                {emails.map((e) => (
                  <a
                    key={e}
                    className="transition-colors hover:text-[#f2d66c] hover:underline"
                    href={`mailto:${e}`}
                  >
                    {e}
                  </a>
                ))}
              </span>
            </dd>
          </dl>

        </div>
      </footer>

      {/* 最底部深色版权与导航栏 */}
      <div className="border-t border-[#f2d66c]/20 bg-[#a30d25] text-[12px] leading-[55px] text-white">
        <div className="mx-auto flex w-full max-w-[1560px] flex-wrap items-center justify-between gap-4 px-3">
          <ul className="flex flex-wrap items-center gap-1">
            {[
              { label: "Home", href: "/" },
              { label: "About", href: "/about" },
              { label: "Product", href: "/products" },
              { label: "News", href: "/news" },
              { label: "Contact", href: "/contact" },
            ].map((l, index, arr) => (
              <li key={l.label} className="flex items-center">
                <Link className="transition-colors hover:text-[#f2d66c] hover:underline" href={l.href}>
                  {l.label}
                </Link>
                {index < arr.length - 1 && <span className="mx-[5px] text-[#f2d66c]/60">|</span>}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            {/*
              两个访客统计入口 —— 运营自己用，放在页面最底部方便随时点开。

              ① 百度统计（📊）：中文访客的细节报表（页面分析 / 实时访客 /
                 地域 / 来源）。10000738265 是账号 ID，23575971 是站点 ID。
              ② Cloudflare Web Analytics（☁️）：免 cookie、无限量、数据在
                 边缘采集。boppfilmsales.com 已在 Cloudflare 开启自动注入，
                 所以站点无需任何额外代码就能收到数据。

              安全说明：两者都是普通外链，点开后仍需登录各自后台才能看到
              数据，因此放在公开页脚不会泄露任何访客信息。
            */}
            <a
              className="flex items-center gap-2 transition-colors hover:text-[#f2d66c]"
              href="https://tongji.baidu.com/main/overview/10000738265/overview/index"
              rel="noreferrer noopener"
              target="_blank"
              title="百度统计 · 访客分析（需登录）"
            >
              <span className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full bg-[#2b6cf6] text-[11px] leading-none text-white shadow">
                📊
              </span>
              <span className="underline-offset-2 hover:underline">Baidu Analytics</span>
            </a>

            <span className="text-[#f2d66c]/40">|</span>

            <a
              className="flex items-center gap-2 transition-colors hover:text-[#f2d66c]"
              href="https://dash.cloudflare.com/1558b11cf56bf7597de219af04f1834b/web-analytics/sites"
              rel="noreferrer noopener"
              target="_blank"
              title="Cloudflare Web Analytics · 真实用户度量（需登录）"
            >
              <span className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full bg-[#f6821f] text-[11px] leading-none text-white shadow">
                ☁️
              </span>
              <span className="underline-offset-2 hover:underline">Cloudflare Analytics</span>
            </a>

            <span className="text-[#f2d66c]/40">|</span>
            <span>{copyright}</span>
            {beian ? <span className="text-[#f2d66c]/80">{beian}</span> : null}
          </div>
        </div>
      </div>
    </>
  );
}