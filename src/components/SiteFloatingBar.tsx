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

        {/* WhatsApp */}
        <BarItem divide label="WhatsApp" position="-80px -60px">
          <PanelTitle>WhatsApp</PanelTitle>
          <em className="block text-[13px] not-italic leading-[18px] text-[#000]">
            <span className="block">86-86-18919654871</span>
            <span className="block">86-86-18919659471</span>
          </em>
        </BarItem>

        {/* WeChat QR codes */}
        <BarItem label={t("WeChat", "微信")} position="0 -295px">
          <div className="flex max-w-[calc(100vw-90px)] flex-wrap gap-[20px] bg-white p-[10px]">
            {["/images/qr/qr1.jpg", "/images/qr/qr2.jpg", "/images/qr/qr3.jpg", "/images/qr/qr4.jpg"].map(
              (src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt="WeChat QR code"
                  className="h-[130px] w-[130px] object-cover"
                  key={src}
                  src={src}
                />
              ),
            )}
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
