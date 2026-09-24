import Link from "next/link";
import { getSiteSettings, setting } from "@/lib/site-settings";

/**
 * Async server component: the contact block and the copyright line are driven
 * by 高级管理 → 系统管理 → 站点设置, so an operator can change them without a
 * redeploy. `getSiteSettings()` never throws — it falls back to the built-in
 * defaults when the database is unavailable.
 */
export default async function SiteFooter() {
  const settings = await getSiteSettings();
  const address = setting(settings, "contact_address");
  const phone = setting(settings, "contact_phone");
  const mobile = setting(settings, "contact_mobile");
  const email = setting(settings, "contact_email");
  const copyright = setting(settings, "footer_copyright");
  const beian = setting(settings, "footer_beian");
  return (
    <>
      <footer className="mt-16 bg-[#c8102e] py-10 text-white">
        <div className="mx-auto grid w-full max-w-[1560px] gap-8 px-3 md:grid-cols-4">
          
          {/* 第一列：Link */}
          <dl>
            <dt className="mb-[10px] text-[18px] font-bold">Link</dt>
            {[
              { label: "Asia Pacific Industry Group Co., Limited", href: "/" },
              { label: "Anhui Eastern Communication Group", href: "/" },
              { label: "Asia Pacific International Co., Limited", href: "/" },
              { label: "Foreign exchange", href: "http://www.boc.cn/sourcedb/whpj" },
              { label: "Shipping Information", href: "http://www.shipxy.com/" },
              { label: "Shipping fees", href: "http://ship.shippingchina.com/fclprice/index" },
              { label: "Site background", href: "http://www.apigcl.com/admin/" },
            ].map((l) => (
              <dd className="text-[12px] leading-[26px]" key={l.label}>
                <a 
                  className="hover:underline" 
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
            <dt className="mb-[10px] text-[18px] font-bold">Product categories</dt>
            {[
              "BOPET Film (Polyester Film)",
              "BOPP Film (Polypropylene film)",
              "BOPP Packing Tape Jumbo Rolls",
              "BOPP/BOPET Thermal Laminating Film coated EVA",
              "POF Shrink Film (Polyolefin)",
              "BOPS Window Envelope Film",
            ].map((p) => (
              <dd className="text-[12px] leading-[26px]" key={p}>
                <Link className="hover:underline" href="/products">
                  {p}
                </Link>
              </dd>
            ))}
          </dl>

          {/* 第三列：Enterprise information (带圆标图标) */}
          <dl>
            <dt className="mb-[10px] text-[18px] font-bold">Enterprise information</dt>
            
            <dd className="flex items-center gap-2.5 text-[12px] leading-[30px]">
              <span className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-[#00aff0] text-[11px] font-bold text-white shadow">
                S
              </span>
              <span>Skype: asiapacificsale</span>
            </dd>

            <dd className="flex items-center gap-2.5 text-[12px] leading-[30px]">
              <span className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-[#12b7f5] text-[10px] font-bold text-white shadow">
                QQ
              </span>
              <span>QQ: 840715367</span>
            </dd>

            <dd className="flex items-center gap-2.5 text-[12px] leading-[30px]">
              <span className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-[#07c160] text-[9px] font-bold text-white shadow">
                微信
              </span>
              <span>WhatsApp: 86-18919654871</span>
            </dd>

            <dd className="flex items-center gap-2.5 text-[12px] leading-[30px]">
              <span className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-[#25d366] text-[10px] font-bold text-white shadow">
                📞
              </span>
              <span>Tel: 86-551-64687285</span>
            </dd>
          </dl>

          {/* 第四列：Contact us (带地址、电话、邮件图标) */}
          <dl>
            <dt className="mb-[10px] text-[18px] font-bold">Contact us</dt>
            
            <dd className="flex items-start gap-2.5 text-[13px] leading-[22px] mb-2">
              <span className="mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-white text-[11px] text-[#c8102e] shadow">
                📍
              </span>
              <span>{address}</span>
            </dd>

            <dd className="flex items-center gap-2.5 text-[13px] leading-[26px]">
              <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-white text-[11px] text-[#c8102e] shadow">
                ☎
              </span>
              <span>Tel: {phone}</span>
            </dd>

            <dd className="flex items-center gap-2.5 text-[13px] leading-[26px]">
              <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-white text-[11px] text-[#c8102e] shadow">
                📱
              </span>
              <span>Mobile: {mobile}</span>
            </dd>

            <dd className="flex items-center gap-2.5 text-[13px] leading-[26px]">
              <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-white text-[10px] text-[#c8102e] shadow">
                ✉
              </span>
              <a className="hover:underline" href={`mailto:${email}`}>
                {email}
              </a>
            </dd>
          </dl>

        </div>
      </footer>

      {/* 最底部深色版权与导航栏 */}
      <div className="bg-[#a30d25] text-[12px] leading-[55px] text-white">
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
                <Link className="hover:underline" href={l.href}>
                  {l.label}
                </Link>
                {index < arr.length - 1 && <span className="mx-[5px]">|</span>}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            <span>{copyright}</span>
            {beian ? <span className="opacity-80">{beian}</span> : null}
          </div>
        </div>
      </div>
    </>
  );
}