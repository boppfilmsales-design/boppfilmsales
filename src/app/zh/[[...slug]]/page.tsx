import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import HomeContent from "@/components/pages/HomeContent";
import { getLatestPostsSafe } from "@/lib/home-data";
import { SITE } from "@/lib/site-helpers";
import { getHomeSummary } from "@/lib/site-summary";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug?: string[] }>;

const NEWS_CAT_ZH: Record<string, string> = {
  "Industry News": "行业新闻",
  "Company News": "公司新闻",
  "Employees Literary": "员工文苑",
};

const TITLES: Record<string, string> = {
  "": `${SITE.nameZh} - BOPP/BOPET 薄膜、胶带母卷、预涂膜生产厂家`,
  products: "产品中心 - 亚太工业集团有限公司",
  downloads: "下载中心 - 技术资料 / MSDS / 证书",
  about: "关于我们 - 亚太工业集团有限公司",
  honor: "荣誉资质 - 亚太工业集团有限公司",
  service: "服务中心 - 亚太工业集团有限公司",
  cases: "经典案例 - 亚太工业集团有限公司",
  "product-lines": "生产线 - 亚太工业集团有限公司",
  contact: "联系我们 - 亚太工业集团有限公司",
  news: "新闻中心 - 亚太工业集团有限公司",
};

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug = [] } = await params;
  return { title: TITLES[slug[0] ?? ""] ?? TITLES[""], description: SITE.nameZh };
}

export default async function ZhPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<{ id?: string; c_id?: string; top_id?: string; p?: string; sub?: string }>;
}) {
  const { slug = [] } = await params;
  const query = await searchParams;
  const [first, second, third, fourth] = slug;
  let content: React.ReactNode;

  if (!first) {
    const summary = getHomeSummary();
    const news = await getLatestPostsSafe(6).catch(() => []);
    content = <HomeContent lang="zh" initialData={{ ...summary, news }} />;
  } else if (first === "products" && second && third === "list" && fourth) {
    const [{ getCategory, getSub }, { ProductSubPage }] = await Promise.all([
      import("@/lib/site"),
      import("@/components/pages/Sections"),
    ]);
    const category = getCategory(second);
    const sub = category ? getSub(category, fourth) : undefined;
    if (!category || !sub) notFound();
    content = <ProductSubPage category={category} lang="zh" sub={sub} />;
  } else if (first === "entry" && second && third && fourth) {
    const { ContentEntryPage } = await import("@/components/pages/Sections");
    content = (
      <ContentEntryPage
        columnId={third}
        kind={second as "about" | "lines" | "honor" | "service" | "cases"}
        lang="zh"
        sourceId={fourth}
      />
    );
  } else if (first === "products" && second && third) {
    const [{ findProduct }, { ProductDetail }] = await Promise.all([
      import("@/lib/site"),
      import("@/components/pages/Sections"),
    ]);
    const found = findProduct(second, third);
    if (!found) notFound();
    content = <ProductDetail category={found.category} product={found.product} lang="zh" />;
  } else if (first === "products" && second) {
    const [{ getCategory }, { ProductCategoryPage }] = await Promise.all([
      import("@/lib/site"),
      import("@/components/pages/Sections"),
    ]);
    const category = getCategory(second);
    if (!category) notFound();
    content = <ProductCategoryPage category={category} lang="zh" />;
  } else if (first === "downloads") {
    const { DownloadsPage } = await import("@/components/pages/Sections");
    content = <DownloadsPage lang="zh" />;
  } else if (["about", "honor", "service", "cases", "product-lines"].includes(first)) {
    const { ContentColumnPage } = await import("@/components/pages/Sections");
    const kind = first === "product-lines" ? "lines" : (first as "about" | "honor" | "service" | "cases");
    const id = Number(query.id ?? query.c_id ?? second);
    content = (
      <ContentColumnPage kind={kind} lang="zh" sourceId={Number.isFinite(id) && id > 0 ? id : undefined} />
    );
  } else if (first === "news") {
    const posts = await getLatestPostsSafe(30);
    content = (
      <div className="mx-auto w-full max-w-[1560px] px-4 py-14">
        <h1 className="text-center text-[28px] font-black text-[#22262e]">新闻中心</h1>
        <i className="mx-auto mt-3 block h-[5px] w-[90px] bg-[#c8102e]" />
        <ul className="mx-auto mt-9 max-w-[980px] divide-y divide-[#eee] border border-[#eee]">
          {posts.map((post) => (
            <li className="flex flex-wrap items-start justify-between gap-3 p-5" key={post.id}>
              <a
                className="max-w-[700px] text-[14px] font-bold text-[#333] hover:text-[#c8102e]"
                href={`/news/${post.slug}/${post.id}`}
              >
                {post.title}
              </a>
              <span className="text-[12px] text-[#999]">
                {NEWS_CAT_ZH[post.category] ?? post.category} · {post.listDate}
              </span>
            </li>
          ))}
          {posts.length === 0 && (
            <li className="p-6 text-center text-[13px] text-[#888]">新闻加载中…</li>
          )}
        </ul>
      </div>
    );
  } else if (first === "contact") {
    content = (
      <div className="py-16 text-center text-[14px] leading-[30px] text-[#555]">
        <h1 className="text-[24px] font-bold text-[#22262e]">联系我们</h1>
        <p className="mt-4">{SITE.nameZh}</p>
        <p>地址：{SITE.address}</p>
        <p>电话：{SITE.tel}</p>
        <p>手机 / WhatsApp：{SITE.mobile}</p>
        <p>
          邮箱：
          <a className="text-[#c8102e] underline" href={`mailto:${SITE.email}`}>
            {SITE.email}
          </a>
        </p>
        <a className="mt-6 inline-block bg-[#c8102e] px-6 py-[11px] text-[13px] font-bold text-white" href="/contact">
          在线询盘（英文表单）
        </a>
      </div>
    );
  } else {
    const { ProductsIndex } = await import("@/components/pages/Sections");
    content = <ProductsIndex lang="zh" />;
  }

  const map: Record<string, string> = {
    products: "Products",
    about: "About Us",
    news: "News",
    downloads: "Download",
    "product-lines": "Products Lines",
    honor: "Honor",
    service: "Service Center",
    cases: "Classic Cases",
    contact: "Contact",
  };

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active={map[first ?? ""] ?? "Home"} lang="zh" />
      {content}
      <SiteFooter />
    </div>
  );
}
