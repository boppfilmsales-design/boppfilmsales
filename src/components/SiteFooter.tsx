import Link from "next/link";

export default function SiteFooter() {
  return (
    <>
      <footer className="mt-16 bg-[#c8102e] py-10 text-white">
        <div className="mx-auto grid w-full max-w-[1400px] gap-8 px-3 md:grid-cols-4">
          <dl>
            <dt className="mb-[10px] text-[18px] font-bold">Link</dt>
            {[
              { label: "Asia Pacific Industry Group Co., Limited", href: "/" },
              { label: "Anhui Eastern Communication Group", href: "/" },
              { label: "Asia Pacific International Co., Limited", href: "/" },
              { label: "Foreign exchange", href: "http://www.boc.cn/sourcedb/whpj" },
              { label: "Shipping Information", href: "http://www.shipxy.com/" },
              { label: "Shipping fees", href: "http://ship.shippingchina.com/fclprice/index" },
            ].map((l) => (
              <dd className="text-[12px] leading-[26px]" key={l.label}>
                <a className="hover:underline" href={l.href} rel="noreferrer" target={l.href.startsWith("http") ? "_blank" : undefined}>
                  {l.label}
                </a>
              </dd>
            ))}
          </dl>

          <dl>
            <dt className="mb-[10px] text-[18px] font-bold">Product categories</dt>
            {[
              "BOPET Film (Polyester Film)",
              "BOPP Film (Polypropylene film)",
              "BOPP Packing Tape Jumbo Rolls",
              "BOPP/BOPET Thermal Laminating Film",
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

          <dl>
            <dt className="mb-[10px] text-[18px] font-bold">Enterprise information</dt>
            <dd className="text-[12px] leading-[26px]">Skype: asiapacificsale</dd>
            <dd className="text-[12px] leading-[26px]">QQ: 840715367</dd>
            <dd className="text-[12px] leading-[26px]">WhatsApp: 86-18919654871</dd>
            <dd className="text-[12px] leading-[26px]">Tel: 86-551-64687285</dd>
          </dl>

          <dl>
            <dt className="mb-[10px] text-[18px] font-bold">Contact us</dt>
            <dd className="text-[13px] leading-[26px]">
              NO.3399 LUZHOU AVE., BAOHE DIST., 230051, HEFEI, ANHUI, CHINA
            </dd>
            <dd className="text-[13px] leading-[26px]">Tel: 86-551-64687285</dd>
            <dd className="text-[13px] leading-[26px]">Mobile: 86-18919654871</dd>
            <dd className="text-[13px] leading-[26px]">
              <a className="hover:underline" href="mailto:sales@boppfilmsales.com">
                sales@boppfilmsales.com
              </a>
            </dd>
          </dl>
        </div>
      </footer>
      <div className="bg-[#a30d25] text-[12px] leading-[55px] text-white">
        <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-4 px-3">
          <ul className="flex flex-wrap items-center gap-1">
            {[
              { label: "Home", href: "/" },
              { label: "About", href: "/about" },
              { label: "Product", href: "/products" },
              { label: "News", href: "/news" },
              { label: "Contact", href: "/contact" },
            ].map((l) => (
              <li key={l.label}>
                <Link className="hover:underline" href={l.href}>
                  {l.label}
                </Link>
                <span className="mx-[5px]">|</span>
              </li>
            ))}
          </ul>
          <div>
            Copyright &copy; 2018 All rights reserved. Asia Pacific Industry Group Co., Limited
          </div>
        </div>
      </div>
    </>
  );
}
