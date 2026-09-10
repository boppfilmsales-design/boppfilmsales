import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { getCategories, getLatestPosts } from "@/lib/news";

export const metadata: Metadata = {
  title: "Asia Pacific Industry Group Co., Limited - BOPP / BOPET / POF Film",
  description:
    "Asia Pacific Industry Group Co., Limited — 4.5Mic BOPET film, BOPP film, BOPP tape, BOPP thermal laminating film, polyester film, tobacco film, pearlized film, capacitor film.",
};

export const dynamic = "force-dynamic";

const PRODUCTS = [
  { title: "BOPET Film (Polyester Film)", desc: "4.5 micron thermal transfer base film, plain printing film, capacitor film, metallized film." },
  { title: "BOPP Film (Polypropylene film)", desc: "Printing & laminating, heat sealable, pearlized, matte, tobacco, flower wrapping, metallized." },
  { title: "BOPP Packing Tape Jumbo Rolls", desc: "Clear, super clear, colored and printed jumbo rolls for tape converting lines." },
  { title: "BOPP/BOPET Thermal Laminating Film", desc: "EVA coated thermal laminating film for paper and packaging lamination." },
  { title: "POF Shrink Film (Polyolefin)", desc: "Cross-linked POF shrink film for multipack and sleeve wrapping." },
  { title: "BOPS Window Envelope Film", desc: "Window envelope film with excellent stiffness and printability." },
];

export default async function HomePage() {
  const [categories, latest] = await Promise.all([getCategories(), getLatestPosts(6)]);
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const categorySlug = new Map(categories.map((c) => [c.id, c.slug]));

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="Home" />

      <section className="bg-[linear-gradient(120deg,#e61d39,#a8132a)] py-16 text-white">
        <div className="mx-auto w-full max-w-[1200px] px-3">
          <p className="text-[13px] uppercase tracking-[4px] text-white/70">Since 1998 · Hefei, Anhui, China</p>
          <h1 className="mt-3 max-w-[860px] text-[28px] font-bold leading-tight md:text-[38px]">
            BOPP / BOPET / POF Film, Tape &amp; Thermal Laminating Film Manufacturer &amp; Exporter
          </h1>
          <p className="mt-4 max-w-[760px] text-[14px] leading-[26px] text-white/90">
            Asia Pacific Industry Group Co., Limited supplies 4.5Mic BOPET film, BOPP film, BOPP tape,
            BOPP thermal laminating film, polyester film, BOPP tobacco film, pearlized film, capacitor film and
            BOPET TTR film to converters and distributors worldwide.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link className="bg-white px-6 py-[10px] text-[13px] font-bold text-[#e61d39]" href="/products">
              PRODUCT CATEGORIES
            </Link>
            <Link
              className="border border-white px-6 py-[10px] text-[13px] font-bold text-white"
              href="/news"
            >
              NEWS CENTER
            </Link>
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto w-full max-w-[1200px] px-3">
          <div className="text-center">
            <h2 className="text-[24px] font-bold uppercase text-[#333]">Main Products</h2>
            <i className="mx-auto mt-[12px] block h-[5px] w-[92px] bg-[#e61d39]" />
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {PRODUCTS.map((product) => (
              <Link
                className="group border border-[#eee] p-6 transition-colors hover:border-[#e61d39]"
                href="/products"
                key={product.title}
              >
                <h3 className="text-[15px] font-bold text-[#333] group-hover:text-[#e61d39]">{product.title}</h3>
                <p className="mt-3 text-[13px] leading-[24px] text-[#777]">{product.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f8f8f8] py-14">
        <div className="mx-auto w-full max-w-[1200px] px-3">
          <div className="text-center">
            <h2 className="text-[24px] font-bold uppercase text-[#333]">News</h2>
            <i className="mx-auto mt-[12px] block h-[5px] w-[92px] bg-[#e61d39]" />
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-[5px]">
            {categories.map((category) => (
              <Link
                className="bg-[#eee] px-[10px] py-[8px] text-[13px] font-bold text-[#666] hover:bg-[#e61d39] hover:text-white"
                href={`/news?category=${category.slug}`}
                key={category.id}
              >
                {category.name}
              </Link>
            ))}
          </div>
          <ul className="mx-auto mt-8 max-w-[900px] divide-y divide-[#e8e8e8] bg-white">
            {latest.map((post) => (
              <li className="flex flex-wrap items-start justify-between gap-2 p-5" key={post.id}>
                <Link
                  className="max-w-[680px] text-[14px] font-bold text-[#333] hover:text-[#e61d39]"
                  href={`/news/${categorySlug.get(post.categoryId) ?? "news"}/${post.id}`}
                >
                  {post.title}
                </Link>
                <span className="text-[12px] text-[#999]">
                  {categoryName.get(post.categoryId)} · {post.listDate}
                </span>
              </li>
            ))}
            {latest.length === 0 && (
              <li className="p-5 text-center text-[13px] text-[#888]">No news published yet.</li>
            )}
          </ul>
          <div className="mt-8 text-center">
            <Link
              className="inline-block bg-[#e61d39] px-6 py-[10px] text-[13px] font-bold uppercase text-white"
              href="/news"
            >
              More news
            </Link>
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto grid w-full max-w-[1200px] gap-6 px-3 md:grid-cols-3">
          {[
            { title: "Company", lines: ["Asia Pacific Industry Group Co., Limited", "NO.3399 LUZHOU AVE., BAOHE DIST.", "230051, HEFEI, ANHUI, CHINA"] },
            { title: "Sales", lines: ["Tel: 86-551-64687285", "Mobile: 86-18919654871", "sales@boppfilmsales.com"] },
            { title: "On-line", lines: ["Skype: asiapacificsale", "QQ: 840715367", "WhatsApp: 86-18919654871"] },
          ].map((block) => (
            <div className="border border-[#eee] bg-[#fafafa] p-6" key={block.title}>
              <h3 className="text-[15px] font-bold uppercase text-[#e61d39]">{block.title}</h3>
              {block.lines.map((line) => (
                <p className="mt-2 text-[13px] text-[#666]" key={line}>
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
