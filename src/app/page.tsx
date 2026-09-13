import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { AllPdfsSection } from "@/components/pages/Sections";
import { SITE, allPdfs, getCategories, getLatestPostsSafe, productCount, categoryProductNames, featuredProducts, catalogueImages, productImageUrl } from "@/lib/home-data";

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
  const featured = featuredProducts(10);
  const gallery = catalogueImages(8);

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="Home" />

      {/* hero */}
      <section className="relative isolate overflow-hidden bg-[#101722] text-white">
        <div className="pointer-events-none absolute -left-40 top-0 h-[520px] w-[520px] rounded-full bg-[#c8102e]/20 blur-[130px]" />
        <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.07)_1px,transparent_1px)] [background-size:54px_54px]" />
        <div className="relative mx-auto grid min-h-[680px] w-full max-w-[1560px] items-center gap-14 px-4 py-20 lg:grid-cols-[1.08fr_.92fr] lg:py-24">
          <div>
            <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.24em] text-white/70 backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-[#e31b3d] shadow-[0_0_16px_#e31b3d]" />
              Hefei · China · Global film supply
            </div>
            <h1 className="mt-7 max-w-[760px] text-[42px] font-black leading-[1.03] tracking-[-0.04em] sm:text-[58px] xl:text-[72px]">
              Advanced films.
              <span className="block bg-gradient-to-r from-white via-white to-white/45 bg-clip-text text-transparent">Built for industry.</span>
            </h1>
            <p className="mt-7 max-w-[720px] text-[15px] leading-[29px] text-slate-300 sm:text-[17px]">
              {SITE.name} supplies precision BOPET, BOPP, POF, BOPS and CPP films, tape jumbo rolls,
              thermal lamination materials and complete production lines to converters and manufacturers worldwide.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link className="rounded-full bg-[#c8102e] px-7 py-4 text-[12px] font-black uppercase tracking-[0.16em] text-white shadow-[0_16px_40px_rgba(200,16,46,.3)] transition hover:-translate-y-0.5 hover:bg-[#e31b3d]" href="/products">
                Explore products →
              </Link>
              <Link className="rounded-full border border-white/25 bg-white/[0.04] px-7 py-4 text-[12px] font-black uppercase tracking-[0.16em] text-white backdrop-blur transition hover:border-white hover:bg-white hover:text-slate-950" href="/downloads">
                TDS / MSDS library
              </Link>
            </div>
            <dl className="mt-12 grid max-w-[760px] grid-cols-2 gap-x-6 gap-y-7 border-t border-white/10 pt-8 sm:grid-cols-4">
              {[
                { k: "Product families", v: categories.length },
                { k: "Detailed products", v: productCount() },
                { k: "Document links", v: pdfs.length },
                { k: "Export markets", v: "30+" },
              ].map((stat) => (
                <div key={stat.k}>
                  <dd className="text-[29px] font-black tracking-[-0.04em] text-white">{stat.v}</dd>
                  <dt className="mt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-white/45">{stat.k}</dt>
                </div>
              ))}
            </dl>
          </div>
          <div className="relative hidden lg:block">
            <div className="absolute -inset-5 rounded-[36px] border border-white/10" />
            <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-white/10 p-2 shadow-2xl backdrop-blur">
              {/* Original shipment photograph mirrored from the owned legacy website. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="Asia Pacific Industry Group film rolls prepared for export" className="aspect-[4/5] w-full rounded-[24px] object-cover" src="/uploads/products/9220b185d6079bc5.jpg" />
              <div className="absolute inset-x-7 bottom-7 rounded-2xl border border-white/15 bg-slate-950/75 p-5 backdrop-blur-xl">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ff6b82]">Global delivery</p>
                <p className="mt-2 text-[15px] font-bold text-white">Industrial film rolls prepared for export</p>
                <p className="mt-1 text-[11px] text-white/55">Technical selection · Slitting · Export packing</p>
              </div>
            </div>
            <div className="absolute -left-12 top-16 rounded-2xl border border-white/15 bg-white/95 p-4 text-slate-950 shadow-2xl">
              <span className="block text-2xl font-black text-[#c8102e]">4.5μm</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">BOPET expertise</span>
            </div>
          </div>
        </div>
      </section>

      {/* about us intro — mirrors the legacy "ABOUT US" block */}
      <section className="border-y border-[#ececec] bg-[#f7f8fa] py-20">
        <div className="mx-auto grid w-full max-w-[1560px] items-center gap-14 px-4 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#c8102e]">About us</p>
            <h2 className="mt-4 text-[30px] font-black leading-[1.12] tracking-[-0.02em] text-[#101722] sm:text-[40px]">
              Asia Pacific&apos;s wrapping film packs the world.
            </h2>
            <p className="mt-6 text-[15px] leading-[30px] text-[#5b6472]">
              {SITE.name} is a large multinational group integrating production, research &amp; development and sales.
              In today&apos;s global market economy the group competes fully on product quality, price and service,
              takes the market as its guide, and commits to export-oriented growth.
            </p>
            <p className="mt-4 text-[15px] leading-[30px] text-[#5b6472]">
              Relying on mainland China&apos;s land and labour resources and the advantages of the government&apos;s
              opening-up policy, the group vigorously introduces modern production lines, pursues economies of scale,
              increases investment in research projects and encourages technical innovation — so it can promptly adapt
              to global customers&apos; increasingly specialised, diversified and personalised requirements.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link className="rounded-full bg-[#c8102e] px-6 py-3 text-[12px] font-black uppercase tracking-[0.16em] text-white shadow-[0_14px_34px_rgba(200,16,46,.28)] transition hover:-translate-y-0.5 hover:bg-[#e31b3d]" href="/about">
                Company profile →
              </Link>
              <Link className="rounded-full border border-[#d6dae0] bg-white px-6 py-3 text-[12px] font-black uppercase tracking-[0.16em] text-[#101722] transition hover:border-[#c8102e] hover:text-[#c8102e]" href="/honor">
                Honours &amp; certificates
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {gallery.slice(0, 4).map((g) => (
              <figure className="group relative overflow-hidden rounded-2xl border border-[#e8e8e8] bg-white shadow-sm" key={g.src}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt={g.title} className="aspect-[4/3] w-full object-cover transition duration-700 group-hover:scale-105" src={g.src} />
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* product families */}
      <section className="py-16">
        <div className="mx-auto w-full max-w-[1560px] px-4">
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
                  {categoryProductNames(category, 3).join(" · ")}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* product & classification — featured highlights (mirrors the source section) */}
      <section className="bg-[#101722] py-20 text-white">
        <div className="mx-auto w-full max-w-[1560px] px-4">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#ff6b82]">Product &amp; classification</p>
              <h2 className="mt-3 text-[28px] font-black tracking-[-0.02em] sm:text-[34px]">Featured products</h2>
            </div>
            <Link
              className="rounded-full border border-white/25 px-6 py-3 text-[12px] font-black uppercase tracking-[0.16em] text-white transition hover:bg-white hover:text-slate-950"
              href="/products"
            >
              All {productCount()} products →
            </Link>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {featured.map(({ category, product }) => (
              <Link
                className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] transition hover:-translate-y-1 hover:border-white/30"
                href={`/products/${category.sourceId}/${product.sourceId}`}
                key={`${category.sourceId}-${product.sourceId}`}
              >
                <div className="overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={product.title}
                    className="aspect-[4/3] w-full object-cover transition duration-700 group-hover:scale-110"
                    src={productImageUrl(product.gallery[0])}
                  />
                </div>
                <div className="p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">{category.name}</p>
                  <p className="mt-2 line-clamp-2 text-[13px] font-bold leading-snug text-white group-hover:text-[#ff8fa1]">
                    {product.title}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <AllPdfsSection />

      {/* news */}
      <section className="py-16">
        <div className="mx-auto w-full max-w-[1560px] px-4">
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
        <div className="mx-auto grid w-full max-w-[1560px] gap-6 px-4 md:grid-cols-3">
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
