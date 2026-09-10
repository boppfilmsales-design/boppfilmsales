import Link from "next/link";
import {
  allDownloads,
  contentBody,
  contentImages,
  getCategories,
  getContent,
  getContents,
  honorItems,
  productCount,
  stripHtml,
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
      <div className="mx-auto w-full max-w-[1400px] px-4">
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
            ? "BOPET、BOPP、POF、BOPS、CPP、胶带母卷、预涂膜、铝箔、标签碳带及薄膜生产线设备等 18 大类、200 余种产品，附完整技术参数表 PDF 下载。"
            : "18 product families and 200+ items — BOPET, BOPP, POF, BOPS, CPP films, tape jumbo rolls, thermal laminating film, aluminium foil, labels & ribbons and film machine lines. Every technical data sheet (PDF) is available for download."
        }
        title={lang === "zh" ? "产品中心" : "Product Center"}
      />
      <section className="py-14">
        <div className="mx-auto w-full max-w-[1400px] px-4">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {categories.map((category) => (
              <Link
                className="group border border-[#e8e8e8] bg-white p-6 transition-all hover:-translate-y-[3px] hover:border-[#c8102e] hover:shadow-xl"
                href={`${base}/products/${category.sourceId}`}
                key={category.sourceId}
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-[16px] font-bold leading-snug text-[#22262e] group-hover:text-[#c8102e]">
                    {category.name}
                  </h2>
                  <span className="shrink-0 bg-[#f4f4f4] px-2 py-[2px] text-[11px] font-bold text-[#888]">
                    {productCount(category)}
                  </span>
                </div>
                <ul className="mt-4 space-y-[6px]">
                  {category.subs.slice(0, 4).map((sub) => (
                    <li className="truncate text-[13px] text-[#666]" key={sub.sourceId}>
                      · {sub.name}
                    </li>
                  ))}
                </ul>
                <span className="mt-5 inline-block text-[12px] font-bold uppercase tracking-[1px] text-[#c8102e]">
                  {lang === "zh" ? "查看系列" : "Explore range"} →
                </span>
              </Link>
            ))}
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
  return (
    <>
      <PageHero
        breadcrumb={[lang === "zh" ? "产品中心" : "Products", category.name]}
        lang={lang}
        subtitle={`${items.length} ${lang === "zh" ? "款产品" : "products in this family"}`}
        title={category.name}
      />
      <section className="py-12">
        <div className="mx-auto w-full max-w-[1400px] px-4">
          <div className="flex flex-wrap gap-2">
            {category.subs.map((sub) => (
              <span className="bg-[#f4f4f4] px-3 py-[7px] text-[12px] font-bold text-[#666]" key={sub.sourceId}>
                {sub.name} ({sub.items.length})
              </span>
            ))}
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map(({ sub, product }) => (
              <Link
                className="group flex flex-col border border-[#e8e8e8] bg-white transition-all hover:-translate-y-[3px] hover:border-[#c8102e] hover:shadow-xl"
                href={`${base}/products/${category.sourceId}/${product.sourceId}`}
                key={`${sub.sourceId}-${product.sourceId}`}
              >
                <div className="h-[210px] overflow-hidden bg-[#f7f7f7]">
                  {product.gallery?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={product.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.08]"
                      src={product.gallery[0]}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[12px] font-bold tracking-[2px] text-[#ccc]">
                      NO IMAGE
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="text-[14px] font-bold leading-snug text-[#22262e] group-hover:text-[#c8102e]">
                    {lang === "zh" && product.titleZh ? product.titleZh : product.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-[12px] leading-[20px] text-[#777]">
                    {stripHtml(lang === "zh" && product.bodyHtmlZh ? product.bodyHtmlZh : product.bodyHtml, 90)}
                  </p>
                  <div className="mt-3 flex items-center justify-between border-t border-[#f0f0f0] pt-3 text-[11px] text-[#999]">
                    <span>{product.code || sub.name}</span>
                    {product.pdfs?.length ? (
                      <span className="font-bold text-[#c8102e]">PDF ×{product.pdfs.length}</span>
                    ) : null}
                  </div>
                </div>
              </Link>
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
  const body = lang === "zh" && product.bodyHtmlZh ? product.bodyHtmlZh : product.bodyHtml;
  return (
    <>
      <PageHero
        breadcrumb={[
          lang === "zh" ? "产品中心" : "Products",
          category.name,
          title,
        ]}
        lang={lang}
        title={title}
      />
      <section className="py-12">
        <div className="mx-auto grid w-full max-w-[1400px] gap-10 px-4 lg:grid-cols-[minmax(0,1fr)_420px]">
          {/* gallery */}
          <div>
            <div className="border border-[#e8e8e8] bg-white p-3">
              <div className="h-[420px] overflow-hidden bg-[#f7f7f7]">
                {product.gallery?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt={title} className="h-full w-full object-contain" src={product.gallery[0]} />
                ) : (
                  <div className="flex h-full items-center justify-center text-[13px] text-[#bbb]">NO IMAGE</div>
                )}
              </div>
              {product.gallery && product.gallery.length > 1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto">
                  {product.gallery.map((img, index) => (
                    <div className="h-[74px] w-[74px] shrink-0 border border-[#e5e5e5] p-[3px]" key={img + index}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img alt="" className="h-full w-full object-cover" src={img} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-8 border border-[#e8e8e8] bg-white p-6">
              <h2 className="text-[18px] font-bold text-[#22262e]">
                {lang === "zh" ? "产品详细介绍" : "Product Description"}
              </h2>
              <i className="mt-3 block h-[4px] w-[70px] bg-[#c8102e]" />
              <div
                className="news-body mt-5 text-[14px] leading-[190%] text-[#3d3d3d]"
                dangerouslySetInnerHTML={{ __html: body || `<p>${title}</p>` }}
              />
            </div>
          </div>

          {/* side panel */}
          <aside className="space-y-5">
            <div className="border border-[#e8e8e8] bg-white p-6">
              <h2 className="text-[19px] font-bold leading-snug text-[#22262e]">{title}</h2>
              <dl className="mt-4 space-y-2 text-[13px]">
                <div className="flex justify-between border-b border-[#f2f2f2] pb-2">
                  <dt className="text-[#888]">{lang === "zh" ? "产品编码" : "Product code"}</dt>
                  <dd className="font-bold text-[#333]">{product.code || "—"}</dd>
                </div>
                <div className="flex justify-between border-b border-[#f2f2f2] pb-2">
                  <dt className="text-[#888]">{lang === "zh" ? "产品系列" : "Family"}</dt>
                  <dd className="font-bold text-[#333]">{category.name}</dd>
                </div>
                {product.price ? (
                  <div className="flex justify-between">
                    <dt className="text-[#888]">{lang === "zh" ? "参考价格" : "Reference price"}</dt>
                    <dd className="font-bold text-[#c8102e]">${product.price}</dd>
                  </div>
                ) : null}
              </dl>
              <div className="mt-5 space-y-2">
                <a
                  className="block bg-[#c8102e] py-[13px] text-center text-[13px] font-bold uppercase tracking-[1px] text-white hover:bg-[#a30d25]"
                  href={`mailto:sales@boppfilmsales.com?subject=Inquiry: ${encodeURIComponent(title)}`}
                >
                  {lang === "zh" ? "立即询盘" : "Inquire now"}
                </a>
                <a
                  className="block border border-[#c8102e] py-[13px] text-center text-[13px] font-bold uppercase tracking-[1px] text-[#c8102e] hover:bg-[#c8102e] hover:text-white"
                  href={lang === "zh" ? "/zh/contact" : "/contact"}
                >
                  {lang === "zh" ? "联系我们" : "Contact sales"}
                </a>
              </div>
            </div>

            {/* prominent PDF download card */}
            {product.pdfs && product.pdfs.length > 0 && (
              <div className="border-2 border-[#c8102e] bg-[#fff7f8] p-6">
                <h3 className="text-[15px] font-bold uppercase tracking-[1px] text-[#c8102e]">
                  {lang === "zh" ? "技术参数下载" : "Technical Data Sheet"}
                </h3>
                <p className="mt-2 text-[12px] leading-[20px] text-[#777]">
                  {lang === "zh"
                    ? "点击即可下载 PDF 版技术参数 / 检测报告。"
                    : "Click to download the PDF technical data sheet / test report."}
                </p>
                <div className="mt-4 space-y-3">
                  {product.pdfs.map((pdf) => (
                    <a
                      className="flex items-center gap-3 border border-[#f0c9cf] bg-white px-4 py-3 transition-colors hover:border-[#c8102e] hover:bg-[#c8102e] hover:text-white"
                      download
                      href={pdf.file}
                      key={pdf.file}
                    >
                      <span className="flex h-[38px] w-[34px] shrink-0 items-center justify-center bg-[#c8102e] text-[10px] font-black text-white">
                        PDF
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-bold">
                          {pdf.label || pdf.file.split("/").pop()}
                        </span>
                        <span className="block text-[11px] opacity-70">
                          {lang === "zh" ? "点击下载" : "Click to download"}
                        </span>
                      </span>
                      <span className="text-[16px]">↓</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="border border-[#e8e8e8] bg-white p-6">
              <h3 className="text-[14px] font-bold text-[#22262e]">
                {lang === "zh" ? "同系列其他产品" : "More from this family"}
              </h3>
              <ul className="mt-3 space-y-2">
                {category.subs
                  .flatMap((s) => s.items)
                  .filter((p) => p.sourceId !== product.sourceId)
                  .slice(0, 6)
                  .map((p) => (
                    <li className="truncate border-b border-dotted border-[#eee] pb-2" key={p.sourceId}>
                      <Link
                        className="text-[12px] text-[#666] hover:text-[#c8102e]"
                        href={`${base}/products/${category.sourceId}/${p.sourceId}`}
                      >
                        · {lang === "zh" && p.titleZh ? p.titleZh : p.title}
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}

export function DownloadsPage({ lang = "en" }: { lang?: "en" | "zh" }) {
  const groups = allDownloads();
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
        <div className="mx-auto w-full max-w-[1400px] px-4 space-y-10">
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
                      {row.file ? (
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
        title={active ? active.name : titles[kind][lang]}
      />
      <section className="py-12">
        <div className="mx-auto grid w-full max-w-[1400px] gap-8 px-4 lg:grid-cols-[250px_minmax(0,1fr)]">
          <aside>
            <ul className="border border-[#e8e8e8] bg-white">
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
                    {column.name}
                  </Link>
                </li>
              ))}
            </ul>
          </aside>

          <div className="border border-[#e8e8e8] bg-white p-6 md:p-8">
            {kind === "honor" ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {honorItems().map((item, index) => (
                  <figure className="border border-[#eee] p-3" key={`${item.image}-${index}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img alt={item.title} className="h-[220px] w-full object-contain" src={item.image} />
                    {item.title ? (
                      <figcaption className="mt-3 text-center text-[12px] font-bold text-[#555]">
                        {item.title}
                      </figcaption>
                    ) : null}
                  </figure>
                ))}
                {honorItems().length === 0 && (
                  <p className="text-[13px] text-[#888]">No certificate images found in this column.</p>
                )}
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

export function AllPdfsSection() {
  const pdfs = getCategories().flatMap((c) =>
    c.subs.flatMap((s) => s.items.flatMap((p) => p.pdfs.map((pdf) => ({ ...pdf, product: p.title })))),
  );
  if (pdfs.length === 0) return null;
  return (
    <section className="bg-[#fafafa] py-14">
      <div className="mx-auto w-full max-w-[1400px] px-4">
        <h2 className="text-center text-[26px] font-black text-[#22262e]">
          Technical Library <span className="text-[#c8102e]">({pdfs.length} PDF)</span>
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
