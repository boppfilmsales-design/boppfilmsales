import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { AllPdfsSection } from "@/components/pages/Sections";
import { SITE, allPdfs, getCategories, getLatestPostsSafe, productCount } from "@/lib/home-data";

export const metadata: Metadata = {
  title: `${SITE.name} - 4.5Mic BOPET film, BOPP film, BOPP tape, thermal laminating film`,
  description:
    "Asia Pacific Industry Group Co., Limited — 4.5Mic BOPET film, BOPP film, BOPP tape, BOPP thermal laminating film, polyester film, BOPP tobacco film, pearlized film, capacitor film, BOPET TTR film, POF shrink film and film machine lines.",
  keywords:
    "Asia Pacific Industry Group,4.5Mic BOPET film,BOPP film,BOPP tape,BOPP thermal laminating film,polyester film,bopp tobacco film,BOPP pearlized film,BOPP capacitor film,BOPET TTR film",
};

export default async function HomePage() {
  const categories = getCategories();
  const pdfs = allPdfs();
  const news = await getLatestPostsSafe(6);

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="Home" />

      {/* hero */}
      <section className="relative overflow-hidden bg-[linear-gradient(120deg,#1b1f2a_0%,#2b3140_45%,#c8102e_130%)] py-24 text-white">
        <div className="mx-auto w-full max-w-[1400px] px-4">
          <p className="text-[12px] font-bold uppercase tracking-[5px] text-white/55">
            Hefei · Anhui · China — since 1998
          </p>
          <h1 className="mt-5 max-w-[900px] text-[32px] font-black leading-[1.15] md:text-[48px]">
            {SITE.name}
          </h1>
          <p className="mt-5 max-w-[780px] text-[15px] leading-[30px] text-white/85">
            Professional manufacturer and exporter of {productCount()}+ film &amp; tape products: 4.5Mic BOPET
            thermal transfer base film, BOPP printing / heat-sealable / pearlized / matte film, BOPP tape jumbo
            rolls, EVA thermal laminating film, POF shrink film, BOPS window film, capacitor film and complete
            film machine lines — exported to Europe, the Americas, the Middle East and South-East Asia.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              className="bg-[#c8102e] px-7 py-[14px] text-[13px] font-bold uppercase tracking-[1px] text-white transition-colors hover:bg-white hover:text-[#c8102e]"
              href="/products"
            >
              Product center
            </Link>
            <Link
              className="border border-white/70 px-7 py-[14px] text-[13px] font-bold uppercase tracking-[1px] text-white transition-colors hover:bg-white hover:text-[#1b1f2a]"
              href="/downloads"
            >
              Download TDS / MSDS
            </Link>
            <a
              className="border border-white/70 px-7 py-[14px] text-[13px] font-bold uppercase tracking-[1px] text-white transition-colors hover:bg-white hover:text-[#1b1f2a]"
              href={`mailto:${SITE.email}`}
            >
              Email us
            </a>
          </div>

          <dl className="mt-14 grid max-w-[900px] grid-cols-2 gap-6 border-t border-white/15 pt-8 md:grid-cols-4">
            {[
              { k: "Product families", v: categories.length },
              { k: "Products", v: `${productCount()}+` },
              { k: "PDF data sheets", v: pdfs.length },
              { k: "Export markets", v: "30+" },
            ].map((stat) => (
              <div key={stat.k}>
                <dd className="text-[28px] font-black text-white">{stat.v}</dd>
                <dt className="mt-1 text-[11px] uppercase tracking-[2px] text-white/55">{stat.k}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* product families */}
      <section className="py-16">
        <div className="mx-auto w-full max-w-[1400px] px-4">
          <div className="text-center">
            <h2 className="text-[28px] font-black text-[#22262e]">Main Product Families</h2>
            <i className="mx-auto mt-3 block h-[5px] w-[90px] bg-[#c8102e]" />
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Link
                className="group border border-[#e8e8e8] bg-white p-6 transition-all hover:-translate-y-[3px] hover:border-[#c8102e] hover:shadow-xl"
                href={`/products/${category.sourceId}`}
                key={category.sourceId}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-[15px] font-bold leading-snug text-[#22262e] group-hover:text-[#c8102e]">
                    {category.name}
                  </h3>
                  <span className="shrink-0 bg-[#f4f4f4] px-2 py-[2px] text-[11px] font-bold text-[#888]">
                    {productCount(category)}
                  </span>
                </div>
                <p className="mt-3 line-clamp-3 text-[13px] leading-[22px] text-[#777]">
                  {category.subs
                    .slice(0, 3)
                    .map((s) => s.name)
                    .join(" · ")}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <AllPdfsSection />

      {/* news */}
      <section className="py-16">
        <div className="mx-auto w-full max-w-[1400px] px-4">
          <div className="text-center">
            <h2 className="text-[28px] font-black text-[#22262e]">News Center</h2>
            <i className="mx-auto mt-3 block h-[5px] w-[90px] bg-[#c8102e]" />
          </div>
          <ul className="mx-auto mt-9 max-w-[980px] divide-y divide-[#eee] border border-[#eee]">
            {news.map((post) => (
              <li className="flex flex-wrap items-start justify-between gap-3 p-5" key={post.id}>
                <Link
                  className="max-w-[700px] text-[14px] font-bold text-[#333] hover:text-[#c8102e]"
                  href={`/news/${post.slug}/${post.id}`}
                >
                  {post.title}
                </Link>
                <span className="text-[12px] text-[#999]">
                  {post.category} · {post.listDate}
                </span>
              </li>
            ))}
            {news.length === 0 && (
              <li className="p-6 text-center text-[13px] text-[#888]">News are loading…</li>
            )}
          </ul>
          <div className="mt-8 text-center">
            <Link
              className="inline-block bg-[#c8102e] px-7 py-[12px] text-[13px] font-bold uppercase tracking-[1px] text-white"
              href="/news"
            >
              More news
            </Link>
          </div>
        </div>
      </section>

      {/* contact blocks */}
      <section className="bg-[#f7f8fa] py-16">
        <div className="mx-auto grid w-full max-w-[1400px] gap-6 px-4 md:grid-cols-3">
          {[
            { t: "Company", l: [SITE.name, SITE.address] },
            { t: "Sales", l: [`Tel: ${SITE.tel}`, `Mobile: ${SITE.mobile}`, SITE.email] },
            { t: "On-line", l: [`Skype: ${SITE.skype[0]}`, `QQ: ${SITE.qq[0]}`, `WhatsApp: ${SITE.whatsapp[0]}`] },
          ].map((block) => (
            <div className="border border-[#e8e8e8] bg-white p-7" key={block.t}>
              <h3 className="text-[14px] font-black uppercase tracking-[2px] text-[#c8102e]">{block.t}</h3>
              {block.l.map((line) => (
                <p className="mt-3 text-[13px] leading-[24px] text-[#666]" key={line}>
                  {line}
                </p>
              ))}
            </div>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
