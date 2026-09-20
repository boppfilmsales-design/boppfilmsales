import Link from "next/link";
import ProductCardImage from "@/components/ProductCardImage";
import ProductGallery from "@/components/ProductGallery";
import ProductTabs from "@/components/ProductTabs";
import {
  allDownloads,
  allPdfs,
  contentBody,
  contentEntries,
  contentImages,
  getCategories,
  getContent,
  getContents,
  honorItemsByColumn,
  isValidFile,
  productCount,
  productImageUrl,
  stripHtml,
  validProductPdfs,
  categoryNameZh,
  categoryProductNamesZh,
  contentNameZh,
  type SiteCategory,
  type SiteProduct,
} from "@/lib/site";

export function PageHero({
  title,
  subtitle,
  breadcrumb,
  lang = "en",
}: {
  title: string;
  subtitle?: string;
  breadcrumb: string[];
  lang?: "en" | "zh";
}) {
  const home = lang === "zh" ? "/zh" : "/";
  return (
    <section className="relative overflow-hidden bg-[linear-gradient(115deg,#1b1f2a_0%,#2c3342_55%,#c8102e_140%)] py-16 text-white">
      <div className="mx-auto w-full max-w-[1560px] px-4">
        <nav className="text-[12px] uppercase tracking-[2px] text-white/60">
          <Link className="hover:text-white" href={home}>
            {lang === "zh" ? "首页" : "Home"}
          </Link>
          {breadcrumb.map((item) => (
            <span key={item}> / {item}</span>
          ))}
        </nav>
        <h1 className="mt-3 text-[30px] font-black leading-tight md:text-[42px]">{title}</h1>
        {subtitle ? <p className="mt-3 max-w-[760px] text-[15px] leading-[28px] text-white/80">{subtitle}</p> : null}
      </div>
    </section>
  );
}

export function ProductsIndex({ lang = "en" }: { lang?: "en" | "zh" }) {
  const base = lang === "zh" ? "/zh" : "";
  const categories = getCategories();
  return (
    <>
      <PageHero
        breadcrumb={[lang === "zh" ? "产品中心" : "Products"]}
        lang={lang}
        subtitle={
          lang === "zh"
            ? `BOPET、BOPP、POF、BOPS、CPP、胶带母卷、预涂膜、铝箔、标签碳带及薄膜生产线设备等 ${categories.length} 大类、${productCount()} 个独立产品详情，附已收录的技术参数 PDF 下载。`
            : `${categories.length} product families and ${productCount()} detailed items — BOPET, BOPP, POF, BOPS, CPP films, tape jumbo rolls, thermal laminating film, aluminium foil, labels, ribbons and film machine lines, with the mirrored PDF technical documents available for download.`
        }
        title={lang === "zh" ? "产品中心" : "Product Center"}
      />
      <section className="py-14">
        <div className="mx-auto w-full max-w-[1560px] px-4">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {categories.map((category) => {
              const lead = category.subs.flatMap((sub) => sub.items).find((p) => (p.gallery ?? []).length > 0);
              const catName = lang === "zh" ? (categoryNameZh(category.sourceId) ?? category.name) : category.name;
              const prodNames = lang === "zh" ? categoryProductNamesZh(category, 4) : category.subs.flatMap((sub) => sub.items).slice(0, 4).map((p) => p.title);
              return (
              <Link
                className="group flex flex-col overflow-hidden rounded-2xl border border-[#e8e8e8] bg-white transition-all hover:-translate-y-1 hover:border-[#c8102e] hover:shadow-2xl"
                href={`${base}/products/${category.sourceId}`}
                key={category.sourceId}
              >
                {lead ? (
                  <div className="overflow-hidden bg-[#f4f5f7]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={catName}
                      className="aspect-[16/9] w-full object-cover transition duration-700 group-hover:scale-105"
                      src={productImageUrl(lead.gallery[0])}
                    />
                  </div>
                ) : null}
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-[16px] font-bold leading-snug text-[#22262e] group-hover:text-[#c8102e]">
                      {catName}
                    </h2>
                    <span className="shrink-0 rounded-full bg-[#f4f4f4] px-2 py-[2px] text-[11px] font-bold text-[#888]">
                      {productCount(category)}
                    </span>
                  </div>
                  <ul className="mt-4 space-y-[6px]">
                    {prodNames.map((pname, i) => (
                      <li className="truncate text-[13px] text-[#666]" key={i}>
                        · {pname}
                      </li>
                    ))}
                  </ul>
                  <span className="mt-auto pt-5 inline-block text-[12px] font-bold uppercase tracking-[1px] text-[#c8102e]">
                    {lang === "zh" ? "查看系列" : "Explore range"} →
                  </span>
                </div>
              </Link>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}

export function ProductCategoryPage({
  category,
  lang = "en",
}: {
  category: SiteCategory;
  lang?: "en" | "zh";
}) {
  const base = lang === "zh" ? "/zh" : "";
  const items = category.subs.flatMap((sub) => sub.items.map((product) => ({ sub, product })));
  const catName = lang === "zh" ? (categoryNameZh(category.sourceId) ?? category.name) : category.name;
  return (
    <>
      <PageHero
        breadcrumb={[lang === "zh" ? "产品中心" : "Products", catName]}
        lang={lang}
        subtitle={`${items.length} ${lang === "zh" ? "款产品" : "products in this family"}`}
        title={catName}
      />
      <section className="py-12">
        <div className="mx-auto w-full max-w-[1560px] px-4">
          {/* Clickable sub-category chips */}
          <div className="flex flex-wrap gap-2">
            {category.subs.map((sub) => (
              <a
                className="rounded-full bg-[#f4f4f4] px-4 py-[7px] text-[12px] font-bold text-[#666] transition-all hover:bg-[#c8102e] hover:text-white"
                href={`#sub-${sub.sourceId}`}
                key={sub.sourceId}
              >
                {sub.name} ({sub.items.length})
              </a>
            ))}
          </div>

          {/* Products grouped by sub-category with anchored sections */}
          <div className="mt-10 space-y-12">
            {category.subs.map((sub) => (
              <div id={`sub-${sub.sourceId}`} key={sub.sourceId} className="scroll-mt-32">
                {/* Sub-category section header */}
                <div className="mb-6 flex items-center gap-3 border-b border-[#e8e8e8] pb-4">
                  <h2 className="text-[18px] font-bold text-[#22262e]">{sub.name}</h2>
                  <span className="rounded-full bg-[#c8102e] px-2.5 py-[3px] text-[11px] font-bold text-white">
                    {sub.items.length}
                  </span>
                </div>
                {/* Product cards in this sub-category */}
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {sub.items.map((product) => (
                    <Link
                      className="group flex flex-col border border-[#e8e8e8] bg-white transition-all hover:-translate-y-[3px] hover:border-[#c8102e] hover:shadow-xl"
                      href={`${base}/products/${category.sourceId}/${product.sourceId}`}
                      key={`${sub.sourceId}-${product.sourceId}`}
                    >
                      <div className="h-[210px] overflow-hidden bg-[#f7f7f7]">
                        <ProductCardImage
                          image={product.gallery?.[0]}
                          title={lang === "zh" && product.titleZh ? product.titleZh : product.title}
                        />
                      </div>
                      <div className="flex flex-1 flex-col p-4">
                        <h3 className="text-[14px] font-bold leading-snug text-[#22262e] group-hover:text-[#c8102e]">
                          {lang === "zh" && product.titleZh ? product.titleZh : product.title}
                        </h3>
                        <p className="mt-2 line-clamp-2 text-[12px] leading-[20px] text-[#777]">
                          {stripHtml(lang === "zh" && product.bodyHtmlZh ? product.bodyHtmlZh : product.bodyHtml, 90)}
                        </p>
                        <div className="mt-3 flex items-center justify-between border-t border-[#f0f0f0] pt-3 text-[11px] text-[#999]">
                          <a
                            className="font-bold text-[#666] transition-colors hover:text-[#c8102e]"
                            href={`#sub-${sub.sourceId}`}
                          >
                            {sub.name}
                          </a>
                          {(() => {
                            const validPdfs = validProductPdfs(product);
                            return validPdfs.length ? (
                              <span className="font-bold text-[#c8102e]">PDF x{validPdfs.length}</span>
                            ) : null;
                          })()}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

export function ProductDetail({
  category,
  product,
  lang = "en",
}: {
  category: SiteCategory;
  product: SiteProduct;
  lang?: "en" | "zh";
}) {
  const base = lang === "zh" ? "/zh" : "";
  const title = lang === "zh" && product.titleZh ? product.titleZh : product.title;
  const catName = lang === "zh" ? (categoryNameZh(category.sourceId) ?? category.name) : category.name;
  const validPdfs = validProductPdfs(product);
  return (
    <>
      <PageHero
        breadcrumb={[
          lang === "zh" ? "产品中心" : "Products",
          catName,
          title,
        ]}
        lang={lang}
        title={title}
      />
      <section className="py-12">
        <div className="mx-auto w-full max-w-[1560px] px-4">
          {/* Top: gallery + product info box (mirrors source site prd_box) */}
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
            {/* Gallery */}
            <ProductGallery
              images={product.gallery}
              noImageLabel={lang === "zh" ? "暂无图片" : "Image unavailable"}
              title={title}
            />

            {/* Product info box - matches source site prd_box */}
            <div className="border border-[#e8e8e8] bg-white p-6 shadow-sm">
              <h2 className="text-[20px] font-bold leading-snug text-[#22262e]">{title}</h2>
              {product.code || product.price ? (
                <dl className="mt-5 space-y-3 text-[13px]">
                  {product.code ? (
                    <div className="flex justify-between border-b border-[#f2f2f2] pb-3">
                      <dt className="text-[#888]">{lang === "zh" ? "产品编码" : "Product code"}</dt>
                      <dd className="font-bold text-[#333]">{product.code}</dd>
                    </div>
                  ) : null}
                  <div className="flex justify-between border-b border-[#f2f2f2] pb-3">
                    <dt className="text-[#888]">{lang === "zh" ? "产品系列" : "Family"}</dt>
                    <dd className="font-bold text-[#333]">{catName}</dd>
                  </div>
                  {product.price ? (
                    <div className="flex justify-between border-b border-[#f2f2f2] pb-3">
                      <dt className="text-[#888]">{lang === "zh" ? "批发价格" : "Wholesale price"}</dt>
                      <dd className="font-bold text-[#c8102e]"><em>$</em>{product.price} {lang === "zh" ? "/起" : "/only"}</dd>
                    </div>
                  ) : null}
                </dl>
              ) : (
                <dl className="mt-5 space-y-3 text-[13px]">
                  <div className="flex justify-between border-b border-[#f2f2f2] pb-3">
                    <dt className="text-[#888]">{lang === "zh" ? "产品系列" : "Family"}</dt>
                    <dd className="font-bold text-[#333]">{catName}</dd>
                  </div>
                </dl>
              )}

              {/* Inquiry buttons - matches source site prd_box_lk */}
              <div className="mt-6 space-y-2">
                <a
                  className="block bg-[#c8102e] py-[13px] text-center text-[13px] font-bold uppercase tracking-[1px] text-white hover:bg-[#a30d25]"
                  href={`mailto:sales@boppfilmsales.com?subject=Inquiry: ${encodeURIComponent(title)}`}
                >
                  {lang === "zh" ? "立即询盘" : "Inquire Now"}
                </a>
                <a
                  className="block border border-[#c8102e] py-[13px] text-center text-[13px] font-bold uppercase tracking-[1px] text-[#c8102e] hover:bg-[#c8102e] hover:text-white"
                  href={lang === "zh" ? "/zh/contact" : "/contact"}
                >
                  {lang === "zh" ? "联系我们" : "Contact Sales"}
                </a>
              </div>

              {/* Quick PDF list in sidebar (if any) */}
              {validPdfs.length > 0 && (
                <div className="mt-6 border-t-2 border-[#c8102e] pt-4">
                  <h3 className="text-[14px] font-bold uppercase tracking-[1px] text-[#c8102e]">
                    {lang === "zh" ? "技术资料" : "Technical Data"}
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {validPdfs.map((pdf) => (
                      <li key={pdf.file}>
                        <a
                          href={pdf.file}
                          download
                          className="flex items-center gap-2 text-[12px] text-[#666] hover:text-[#c8102e]"
                        >
                          <span className="flex h-[24px] w-[22px] shrink-0 items-center justify-center bg-[#c8102e] text-[8px] font-black text-white">PDF</span>
                          <span className="truncate">{pdf.label || pdf.file.split("/").pop()}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Tabbed content area - matches source site prdcenter with menu_drop tabs */}
          <div className="mt-8">
            <ProductTabs product={product} lang={lang} />
          </div>

          {/* Related products - matches source site "related Products" section */}
          {(() => {
            const related = category.subs
              .flatMap((s) => s.items)
              .filter((p) => p.sourceId !== product.sourceId)
              .slice(0, 6);
            if (related.length === 0) return null;
            return (
              <div className="mt-12">
                <div className="mb-6 flex items-center gap-3 border-b border-[#e8e8e8] pb-4">
                  <h2 className="text-[20px] font-bold text-[#22262e]">
                    {lang === "zh" ? "相关产品" : "Related Products"}
                  </h2>
                  <i className="block h-[20px] w-[5px] bg-[#c8102e]" />
                </div>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                  {related.map((p) => (
                    <Link
                      className="group flex flex-col border border-[#e8e8e8] bg-white transition-all hover:-translate-y-[3px] hover:border-[#c8102e] hover:shadow-lg"
                      href={`${base}/products/${category.sourceId}/${p.sourceId}`}
                      key={p.sourceId}
                    >
                      <div className="h-[140px] overflow-hidden bg-[#f7f7f7]">
                        <ProductCardImage
                          image={p.gallery?.[0]}
                          title={lang === "zh" && p.titleZh ? p.titleZh : p.title}
                        />
                      </div>
                      <div className="p-3">
                        <h3 className="line-clamp-2 text-[12px] font-bold leading-snug text-[#22262e] group-hover:text-[#c8102e]">
                          {lang === "zh" && p.titleZh ? p.titleZh : p.title}
                        </h3>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </section>
    </>
  );
}

export function DownloadsPage({ lang = "en" }: { lang?: "en" | "zh" }) {
  const groups = allDownloads();
  const productPdfs = allPdfs();
  return (
    <>
      <PageHero
        breadcrumb={[lang === "zh" ? "下载中心" : "Download"]}
        lang={lang}
        subtitle={
          lang === "zh"
            ? "公司通知、技术资料、资质证书与 MSDS 全部 PDF 文件集中下载。"
            : "Company notices, technology data, certificates and MSDS — every PDF in one place."
        }
        title={lang === "zh" ? "下载中心" : "Download Center"}
      />
      <section className="py-12">
        <div className="mx-auto w-full max-w-[1560px] px-4 space-y-10">
          {/* Product technical PDFs */}
          {productPdfs.length > 0 && (
            <div className="border border-[#e8e8e8] bg-white">
              <h2 className="border-b border-[#eee] bg-[#fafafa] px-6 py-4 text-[16px] font-bold text-[#22262e]">
                {lang === "zh" ? "产品技术资料" : "Product Technical Data"}
                <span className="ml-2 text-[12px] font-normal text-[#999]">{productPdfs.length} files</span>
              </h2>
              <ul className="divide-y divide-[#f2f2f2]">
                {productPdfs.map((pdf, index) => (
                  <li className="flex flex-wrap items-center gap-3 px-6 py-4" key={`${pdf.file}-${index}`}>
                    <span className="flex h-[34px] w-[30px] items-center justify-center bg-[#c8102e] text-[9px] font-black text-white">
                      PDF
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-bold text-[#333]">{pdf.product}</span>
                      <span className="block truncate text-[11px] text-[#999]">{pdf.label || "data sheet"}</span>
                    </span>
                    <a
                      className="border border-[#c8102e] px-4 py-[7px] text-[12px] font-bold text-[#c8102e] hover:bg-[#c8102e] hover:text-white"
                      download
                      href={pdf.file}
                    >
                      {lang === "zh" ? "下载" : "Download"}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {groups.map((group) => (
            <div className="border border-[#e8e8e8] bg-white" key={group.column}>
              <h2 className="border-b border-[#eee] bg-[#fafafa] px-6 py-4 text-[16px] font-bold text-[#22262e]">
                {group.column}
                <span className="ml-2 text-[12px] font-normal text-[#999]">{group.rows.length} files</span>
              </h2>
              {group.rows.length === 0 ? (
                <p className="px-6 py-6 text-[13px] text-[#888]">
                  {lang === "zh"
                    ? "此栏目暂无公开文件，请联系 sales@boppfilmsales.com 索取。"
                    : "No public file in this column yet — please ask sales@boppfilmsales.com for a copy."}
                </p>
              ) : (
                <ul className="divide-y divide-[#f2f2f2]">
                  {group.rows.map((row, index) => (
                    <li className="flex flex-wrap items-center gap-3 px-6 py-4" key={`${row.file}-${index}`}>
                      <span className="flex h-[34px] w-[30px] items-center justify-center bg-[#c8102e] text-[9px] font-black text-white">
                        {(row.format || "PDF").slice(0, 4).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-bold text-[#333]">{row.name}</span>
                        <span className="block text-[11px] text-[#999]">
                          {[row.serial, row.date].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      {row.file && isValidFile(row.file) ? (
                        <a
                          className="border border-[#c8102e] px-4 py-[7px] text-[12px] font-bold text-[#c8102e] hover:bg-[#c8102e] hover:text-white"
                          download
                          href={row.file}
                        >
                          {lang === "zh" ? "下载" : "Download"}
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

export function ContentColumnPage({
  kind,
  sourceId,
  lang = "en",
}: {
  kind: "about" | "lines" | "honor" | "service" | "cases";
  sourceId?: number;
  lang?: "en" | "zh";
}) {
  const base = lang === "zh" ? "/zh" : "";
  const href = { about: "/about", lines: "/product-lines", honor: "/honor", service: "/service", cases: "/cases" }[kind];
  const columns = getContents(kind);
  const active = (sourceId ? columns.find((c) => c.sourceId === sourceId) : columns[0]) ?? columns[0];
  const body = contentBody(active, lang);
  const images = contentImages(active);
  const entries = active ? contentEntries(kind, active.sourceId) : [];
  // Entries that are pure external links (e.g. Vessel Shipping Lines) render as a
  // logo-card grid; everything else keeps the article-style list.
  const linkCards = entries.filter((e) => e.isLink && e.externalUrl);
  const otherEntries = entries.filter((e) => !(e.isLink && e.externalUrl));
  const titles: Record<string, { en: string; zh: string }> = {
    about: { en: "About Us", zh: "关于我们" },
    lines: { en: "Production Lines", zh: "生产线" },
    honor: { en: "Honor & Certificates", zh: "荣誉资质" },
    service: { en: "Service Center", zh: "服务中心" },
    cases: { en: "Classic Cases", zh: "经典案例" },
  };

  return (
    <>
      <PageHero
        breadcrumb={[titles[kind][lang]]}
        lang={lang}
        title={active ? (lang === "zh" ? (contentNameZh(active.sourceId) ?? active.name) : active.name) : titles[kind][lang]}
      />
      <section className="py-12">
        <div className="mx-auto grid w-full max-w-[1560px] gap-8 px-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <ul className="overflow-hidden rounded-2xl border border-[#e8e8e8] bg-white shadow-sm">
              {columns.map((column) => (
                <li key={column.sourceId}>
                  <Link
                    className={`block border-b border-[#f2f2f2] px-4 py-[12px] text-[13px] ${
                      active && column.sourceId === active.sourceId
                        ? "bg-[#c8102e] font-bold text-white"
                        : "text-[#555] hover:bg-[#f8f8f8] hover:text-[#c8102e]"
                    }`}
                    href={`${base}${href}?id=${column.sourceId}`}
                  >
                    {lang === "zh" ? (contentNameZh(column.sourceId) ?? column.name) : column.name}
                  </Link>
                </li>
              ))}
            </ul>
          </aside>

          <div className="rounded-2xl border border-[#e8e8e8] bg-white p-6 shadow-sm md:p-10">
            {kind === "honor" ? (
              <div className="space-y-12">
                {columns.map((col) => {
                  const items = honorItemsByColumn(col.sourceId, lang);
                  if (!items.length) return null;
                  const colTitle = lang === "zh" ? (contentNameZh(col.sourceId) ?? col.name) : col.name;
                  return (
                    <div key={col.sourceId}>
                      <h3 className="mb-5 flex items-center gap-3 text-[18px] font-bold text-[#22262e]">
                        <i className="block h-[18px] w-[5px] bg-[#c8102e]" />
                        {colTitle}
                      </h3>
                      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {items.map((item, index) => (
                          <a
                            className="group block overflow-hidden rounded-lg border border-[#eee] bg-white transition hover:-translate-y-1 hover:border-[#c8102e] hover:shadow-lg"
                            href={item.image}
                            key={`${item.image}-${index}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <div className="flex h-[260px] items-center justify-center bg-[#fafafa] p-4 transition group-hover:bg-[#f5f5f5]">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                alt={lang === "zh" && item.titleZh ? item.titleZh : item.title}
                                className="max-h-full max-w-full object-contain transition duration-300 group-hover:scale-105"
                                src={item.image}
                              />
                            </div>
                            <div className="border-t border-[#f0f0f0] px-3 py-3 text-center text-[12px] font-bold leading-snug text-[#555] group-hover:text-[#c8102e]">
                              {lang === "zh" && item.titleZh ? item.titleZh : item.title}
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (active && entries.length > 0) ? (
              <div className="space-y-8">
                {/* Logo-card grid, mirroring the legacy `.service-all` layout. */}
                {linkCards.length > 0 && (
                  <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {linkCards.map((entry, idx) => {
                      const logo = (entry.images && entry.images[0]) || "";
                      const src = logo.startsWith("/uploads/") ? logo : logo ? `/uploads/content/${logo}` : "";
                      return (
                        <a
                          className="group block overflow-hidden rounded-xl border border-[#e8e8e8] bg-white transition hover:-translate-y-1 hover:border-[#c8102e] hover:shadow-lg"
                          href={entry.externalUrl ?? "#"}
                          key={`${entry.title}-${idx}`}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          <div className="flex h-[110px] items-center justify-center bg-[#fafafa] p-3">
                            {src ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img alt={entry.title} className="max-h-full max-w-full object-contain" src={src} />
                            ) : (
                              <span className="text-[11px] font-bold text-[#b9bfc7]">
                                {lang === "zh" ? "暂无图片" : "No image"}
                              </span>
                            )}
                          </div>
                          <div className="border-t border-[#f0f0f0] px-3 py-3 text-center text-[12px] font-bold leading-snug text-[#333] group-hover:text-[#c8102e]">
                            {entry.title}
                          </div>
                        </a>
                      );
                    })}
                  </div>
                )}
                {otherEntries.map((entry, idx) => (
                  <div key={`${entry.sourceId || entry.title}-${idx}`} className="border-b border-[#f0f0f0] pb-8 last:border-0">
                    <h3 className="text-[18px] font-bold text-[#22262e]">{entry.title}</h3>
                    {entry.date ? <p className="mt-1 text-[12px] text-[#999]">{entry.date}</p> : null}
                    {entry.isLink && entry.externalUrl ? (
                      <a
                        className="mt-3 inline-block border border-[#c8102e] px-4 py-2 text-[13px] font-bold text-[#c8102e] hover:bg-[#c8102e] hover:text-white"
                        href={entry.externalUrl}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        {entry.title} →
                      </a>
                    ) : (
                      <>
                        {entry.images && entry.images.length > 0 && (
                          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {entry.images.slice(0, 12).map((img, i) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                alt=""
                                className="h-[200px] w-full border border-[#eee] object-cover"
                                key={`${img}-${i}`}
                                src={img.startsWith("/uploads/content/") ? img : `/uploads/content/${img}`}
                              />
                            ))}
                          </div>
                        )}
                        <div
                          className="news-body mt-4 text-[14px] leading-[190%] text-[#3d3d3d]"
                          dangerouslySetInnerHTML={{ __html: entry.bodyHtml || "<p>Content is being prepared.</p>" }}
                        />
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <>
                {images.length > 0 && (
                  <div className="mb-6 grid gap-4 sm:grid-cols-2">
                    {images.slice(0, 8).map((img, index) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt=""
                        className="h-[240px] w-full border border-[#eee] object-cover"
                        key={img + index}
                        src={img}
                      />
                    ))}
                  </div>
                )}
                <div
                  className="news-body text-[14px] leading-[190%] text-[#3d3d3d]"
                  dangerouslySetInnerHTML={{ __html: body || "<p>Content is being prepared.</p>" }}
                />
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

export function AllPdfsSection({ lang = "en" }: { lang?: "en" | "zh" }) {
  const pdfs = allPdfs();
  if (pdfs.length === 0) return null;
  const headingBase = lang === "zh" ? "技术资料库" : "Technical Library";
  return (
    <section className="bg-[#fafafa] py-14">
      <div className="mx-auto w-full max-w-[1560px] px-4">
        <h2 className="text-center text-[26px] font-black text-[#22262e]">
          {headingBase} <span className="text-[#c8102e]">({pdfs.length} PDF)</span>
        </h2>
        <i className="mx-auto mt-3 block h-[5px] w-[90px] bg-[#c8102e]" />
        <div className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {pdfs.slice(0, 24).map((pdf) => (
            <a
              className="flex items-center gap-3 border border-[#e8e8e8] bg-white px-4 py-3 hover:border-[#c8102e]"
              download
              href={pdf.file}
              key={pdf.file}
            >
              <span className="flex h-[32px] w-[28px] items-center justify-center bg-[#c8102e] text-[9px] font-black text-white">
                PDF
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-bold text-[#333]">{pdf.product}</span>
                <span className="block truncate text-[11px] text-[#999]">{pdf.label || "data sheet"}</span>
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
