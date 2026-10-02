"use client";

import { useEffect, useState } from "react";

/**
 * Source-style fixed right-hand contact bar (apigcl.com `.nav_fixed`).
 * Icons come from the original sprite `images/navRight.png`; each item shows
 * a white fly-out panel on hover, exactly like the source site.
 */

const SPRITE = "url(/images/navRight.png)";

/** Icon cell: 40x40 tile cut out of the sprite at the given background position.
 *  `hoverPosition` mirrors the source-site hover state from `navRight.png`. */
function BarItem({
  position,
  hoverPosition,
  divide,
  children,
  label,
}: {
  position: string;
  hoverPosition?: string;
  divide?: boolean;
  label: string;
  children?: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);
  const bgPos = hover && hoverPosition ? hoverPosition : position;
  return (
    <li
      className={`group relative h-[40px] w-[40px] cursor-pointer bg-no-repeat ring-1 ring-inset ring-[#f2d66c]/20 transition-all duration-200 hover:ring-[#f2d66c]/60 ${
        divide ? "border-b border-white" : ""
      }`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ backgroundImage: SPRITE, backgroundPosition: bgPos }}
      title={label}
    >
      {children ? (
        <div className="invisible absolute right-[47px] top-0 z-10 border border-[#eee] bg-white py-[6px] pl-[10px] pr-[14px] text-left opacity-0 shadow-[0_0_10px_#e5e5e5] transition-all duration-200 group-hover:visible group-hover:opacity-100">
          {children}
        </div>
      ) : null}
    </li>
  );
}

function PanelTitle({ children }: { children: React.ReactNode }) {
  return <span className="block text-[11px] leading-[18px] text-[#333]">{children}</span>;
}

export default function SiteFloatingBar({ lang = "en" }: { lang?: "en" | "zh" }) {
  const [showTop, setShowTop] = useState(false);

  // The source only reveals "back to top" once the page is scrolled.
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 300);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const t = (en: string, zh: string) => (lang === "zh" ? zh : en);

  return (
    <div className="fixed right-[10px] top-[243px] z-[98] hidden w-[40px] md:block">
      <ul>
        {/* Tel */}
        <BarItem divide label={t("Tel", "电话")} position="-80px 0">
          <PanelTitle>{t("Tel", "电话")}</PanelTitle>
          <em className="block text-[13px] not-italic leading-[18px] text-[#000]">
            <a className="hover:text-[#c8102e]" href="tel:86-551-64687285">
              86-551-64687285
            </a>
          </em>
        </BarItem>

        {/* Skype */}
        <BarItem divide label="Skype" position="0 -60px">
          <PanelTitle>Skype</PanelTitle>
          <em className="block text-[13px] not-italic leading-[18px] text-[#000]">
            {["asiapacificsale", "boppfilmsales", "boppfilmsale"].map((s) => (
              <a className="block hover:text-[#c8102e]" href={`skype:${s}?chat`} key={s}>
                {s}
              </a>
            ))}
          </em>
        </BarItem>

        {/*
          WhatsApp —— 两个号码分开显示，各自可点击直接发起对话。

          改造前是两个纯文本 <span>，而且号码写成「86-86-18919654871」
          （前缀重复了一遍），访客既看不明白也点不了。

          现在：
            · 编号 WhatsApp1 / WhatsApp2，一眼能分清是两个人
            · 号码按国际习惯写成 0086-xxx
            · 每条都是 https://wa.me/<国际区号+号码> 链接，点一下直接开聊
              （wa.me 是 WhatsApp 官方短链，桌面端会拉起客户端、手机端
                会拉起 App，没装则引导下载）

          ⚠️ wa.me 只认纯数字：国家码 86 + 手机号，去掉 +、-、空格。
        */}
        <BarItem divide label="WhatsApp" position="-80px -60px">
          <PanelTitle>WhatsApp</PanelTitle>
          <em className="block text-[13px] not-italic leading-[20px] text-[#000]">
            <a
              className="block whitespace-nowrap hover:text-[#c8102e] hover:underline"
              href="https://wa.me/8618919654871"
              rel="noreferrer noopener"
              target="_blank"
              title="Click to chat on WhatsApp"
            >
              WhatsApp1: 0086-18919654871
            </a>
            <a
              className="block whitespace-nowrap hover:text-[#c8102e] hover:underline"
              href="https://wa.me/8618919659471"
              rel="noreferrer noopener"
              target="_blank"
              title="Click to chat on WhatsApp"
            >
              WhatsApp2: 0086-18919659471
            </a>
          </em>
        </BarItem>

        {/*
          WeChat —— 两个微信号分开列出，号码可点击复制，配二维码扫码添加。

          ⚠️ 为什么不能像 WhatsApp 那样"点一下直接开聊"
          ────────────────────────────────────────────────────────────
          WhatsApp 有官方网页短链 https://wa.me/<号码>，点击即可拉起客户端。
          **微信没有等价的网页链接** —— 腾讯从未开放「用 URL 打开与某人聊天」
          的能力。所谓 weixin:// 协议只在微信内置浏览器里有效，普通浏览器
          点了没反应，所以不能用来做客服入口。

          业界对微信客服的标准做法就是**二维码**：访客扫码 → 微信自动弹出
          「添加好友」→ 加完即可聊天。这才是真正可用的"实时对话"路径。

          因此这里做三件事：
            ① 明确列出 Wechat1 / Wechat2 与完整号码
            ② 号码可点击 → 一键复制（方便访客去微信里搜索添加）
            ③ ⭐ **每个号码紧挨着它自己那张二维码** —— 客户不会扫错人

          ⭐ 二维码与号码的对应关系（2026-10-02 运营逐一确认）
             qr2.jpg  →  18919654871（头像：白衬衫、建筑前）
             qr3.jpg  →  18919659471（头像：红夹克、海边）
        */}
        <BarItem label={t("WeChat", "微信")} position="0 -295px">
          <div className="max-w-[calc(100vw-90px)] bg-white p-[12px]">
            <p className="mb-3 text-[12px] font-bold text-[#333]">WeChat / 微信</p>

            {[
              { label: "Wechat1", num: "0086-18919654871", qr: "/images/qr/qr2.jpg" },
              { label: "Wechat2", num: "0086-18919659471", qr: "/images/qr/qr3.jpg" },
            ].map(({ label, num, qr }) => (
              <div className="mb-4 flex items-start gap-3 last:mb-0" key={num}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={`${label} WeChat QR code`}
                  className="h-[120px] w-[120px] shrink-0 border border-[#eee] object-cover"
                  src={qr}
                />
                <div className="min-w-[150px] pt-1">
                  <p className="text-[12px] font-bold text-[#333]">{label}</p>
                  <button
                    className="mt-1 block cursor-pointer whitespace-nowrap text-left text-[12px] leading-[18px] text-[#000] hover:text-[#07c160]"
                    onClick={() => {
                      // 复制纯号码，方便直接粘进微信「添加朋友」
                      void navigator.clipboard?.writeText(num).then(
                        () => window.alert(`${label} ${num}\n\n已复制，可粘贴到微信「添加朋友」里搜索。`),
                        () => window.alert(`${label}：${num}`),
                      );
                    }}
                    title="点击复制号码 — 可粘贴到微信「添加朋友」搜索"
                    type="button"
                  >
                    {num}
                    <span className="ml-1 text-[11px] text-[#07c160]">复制</span>
                  </button>
                  <p className="mt-2 text-[11px] leading-[16px] text-[#888]">
                    {t("Scan to add friend", "扫码添加好友")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </BarItem>

        {/* QQ */}
        <BarItem label="QQ" position="0 0">
          <PanelTitle>QQ</PanelTitle>
          <em className="block text-[13px] not-italic leading-[18px] text-[#000]">
            {["840715367", "2538474128", "156641365", "2500526557"].map((q) => (
              <a
                className="block hover:text-[#c8102e]"
                href={`http://wpa.qq.com/msgrd?v=3&uin=${q}&site=qq&menu=yes`}
                key={q}
                rel="noreferrer"
                target="_blank"
              >
                {q}
              </a>
            ))}
          </em>
        </BarItem>

        {/* Feedback -> message form on the contact page */}
        <BarItem
          hoverPosition="-80px -120px"
          label={t("Feedback", "留言反馈")}
          position="0 -120px"
        >
          <a
            className="block whitespace-nowrap text-[13px] leading-[28px] text-[#000] hover:text-[#c8102e]"
            href={lang === "zh" ? "/zh/contact#contact_meg" : "/contact#contact_meg"}
          >
            {t("Feedback", "留言反馈")}
          </a>
        </BarItem>

        {/* Site QR code */}
        <BarItem hoverPosition="-80px -242px" label="QR" position="0 -242px">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="Website QR code"
            className="h-[130px] w-[150px] bg-white"
            src="/images/ewm.png"
          />
        </BarItem>

        {/* Back to top */}
        {showTop ? (
          <li
            className="h-[40px] w-[40px] cursor-pointer bg-no-repeat"
            onClick={() => window.scrollTo({ behavior: "smooth", top: 0 })}
            style={{ backgroundImage: SPRITE, backgroundPosition: "0 -180px" }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundPosition = "0 -180px";
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundPosition = "-80px -180px";
            }}
            title={t("Back to top", "返回顶部")}
          />
        ) : null}
      </ul>
    </div>
  );
}
