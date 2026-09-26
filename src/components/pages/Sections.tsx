import Link from "next/link";
import ProductFamilyGrid from "@/components/ProductFamilyGrid";
import ProductGallery from "@/components/ProductGallery";
import ProductListing, { type ProductCard } from "@/components/ProductListing";
import ProductTabs, { type ProductTabItem } from "@/components/ProductTabs";
import {
  allDownloads,
  allPdfs,
  contentBody,
  contentCards,
  contentImages,
  contentNameZh,
  familyProducts,
  getCategories,
  getContent,
  getContents,
  isValidFile,
  productCount,
  productImageUrl,
  subNameZh,
  subProducts,
  stripHtml,
  validProductPdfs,
  type ProductFamily,
  type ProductItem,
  type ProductSub,
  type SiteContent,
} from "@/lib/site";
import { getSiteSettings, settingNumber } from "@/lib/site-settings";
import { sanitizeRichHtml } from "@/lib/rich-text";

type Lang = "en" | "zh";

const baseOf = (lang: Lang) => (lang === "zh" ? "/zh" : "");
const pick = (lang: Lang, en: string, zh: string) => (lang === "zh" ? zh : en);

const SECTION_TITLES: Record<string, { en: string; zh: string }> = {
  about: { en: "About Us", zh: "关于我们" },
  lines: { en: "Production Lines", zh: "生产线" },
  honor: { en: "Honor & Certificates", zh: "荣誉资质" },
  service: { en: "Service Center", zh: "服务中心" },
  cases: { en: "Classic Cases", zh: "经典案例" },
  down: { en: "Download", zh: "下载中心" },
};

const COLUMN_HREF: Record<string, string> = {
  about: "/about",
  lines: "/product-lines",
  honor: "/honor",
  service: "/service",
  cases: "/cases",
  down: "/downloads",
};

function familyName(family: ProductFamily, lang: Lang) {
  return lang === "zh" ? family.nameZh || family.name : family.name;
}

function subLabel(sub: ProductSub, lang: Lang) {
  return lang === "zh" ? subNameZh(sub) : sub.name;
}

function itemName(item: ProductItem, lang: Lang) {
  return lang === "zh" && item.titleZh ? item.titleZh : item.title;
}

function itemSummary(item: ProductItem, lang: Lang, max = 160) {
  const value = lang === "zh" && item.summaryZh ? item.summaryZh : item.summary;
  return stripHtml(value || item.title, max);
}

function toCard(
  card: ProductItem,
  href: string,
  sub: ProductSub | undefined,
  lang: Lang,
): ProductCard {
  return {
    id: card.sourceId,
    href,
    title: itemName(card, lang),
    summary: itemSummary(card, lang),
    code: card.code,
    price: card.price,
    image: card.gallery?.[0] ?? "",
    subName: sub ? subLabel(sub, lang) : "",
    pdfCount: validProductPdfs(card).length,
  };
}

export function entryHref(kind: string, columnId: number, sourceId: number, lang: Lang = "en") {
  return `${baseOf(lang)}/entry/${kind}/${columnId}/${sourceId}`;
}

export function PageHero({
  title,
  subtitle,
  breadcrumb,
  lang = "en",
}: {
  title: string;
  subtitle?: string;
  breadcrumb: string[];
  lang?: Lang;
}) {
  const home = lang === "zh" ? "/zh" : "/";
  return (
    <section className="relative overflow-hidden bg-[linear-gradient(115deg,#1b1f2a_0%,#2c3342_55%,#c8102e_140%)] py-14 text-white">
      <div className="mx-auto w-full max-w-[1560px] px-4">
        <nav className="text-[12px] uppercase tracking-[2px] text-white/60">
          <Link className="hover:text-white" href={home}>
            {lang === "zh" ? "首页" : "Home"}
          </Link>
          {breadcrumb.map((item) => (
            <span key={item}> / {item}</span>
          ))}
        </nav>
        <h1 className="mt-3 text-[28px] font-black leading-tight md:text-[38px]">{title}</h1>
        {subtitle ? <p className="mt-3 max-w-[880px] text-[14px] leading-[26px] text-white/80">{subtitle}</p> : null}
      </div>
    </section>
  );
}

function FamilyStrip({ active, lang }: { active: number; lang: Lang }) {
  const base = baseOf(lang);
  return (
    <ul className="grid grid-cols-1 border-l border-t border-[#e2e2e2] text-[12px] sm:grid-cols-2 lg:grid-cols-4">
      {getCategories().map((family) => (
        <li key={family.sourceId}>
          <Link
            className={`block truncate border-b border-r border-[#e2e2e2] px-3 py-[10px] transition-colors ${
              family.sourceId === active
                ? "bg-[#c8102e] font-bold text-white"
                : "bg-[#f8f9fa] font-bold text-[#333] hover:bg-[#f1f3f5] hover:text-[#c8102e]"
            }`}
            href={`${base}/products/${family.sourceId}`}
            title={familyName(family, lang)}
          >
            {familyName(family, lang)}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function SubStrip({ family, activeId, lang }: { family: ProductFamily; activeId?: number; lang: Lang }) {
  const base = baseOf(lang);
  return (
    <ul className="grid gap-x-6 gap-y-[6px] text-[12px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <li className="flex items-start gap-[6px]">
        <span className="text-[#c8102e]">›</span>
        <Link
          className={activeId ? "text-[#555] hover:text-[#c8102e]" : "font-bold text-[#c8102e]"}
          href={`${base}/products/${family.sourceId}`}
        >
          {pick(lang, "All", "全部")}
        </Link>
      </li>
      {family.subs.map((sub) => (
        <li className="flex items-start gap-[6px]" key={sub.sourceId}>
          <span className="text-[#c8102e]">›</span>
          <Link
            className={
              sub.sourceId === activeId
                ? "font-bold text-[#c8102e]"
                : "text-[#555] hover:text-[#c8102e]"
            }
            href={`${base}/products/${family.sourceId}/list/${sub.sourceId}`}
          >
            {subLabel(sub, lang)}
            <span className="ml-1 text-[11px] text-[#aaa]">({subProducts(sub).length})</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function FamilyHeader({
  family,
  sub,
  lang,
}: {
  family: ProductFamily;
  sub?: ProductSub | undefined;
  lang: Lang;
}) {
  return (
    <>
      <FamilyStrip active={family.sourceId} lang={lang} />
      <div className="mt-5">
        <SubStrip activeId={sub?.sourceId} family={family} lang={lang} />
      </div>
      <h2 className="mt-7 flex items-center gap-3 border-b border-[#ececec] pb-3 text-[18px] font-bold text-[#22262e]">
        <i className="block h-[18px] w-[5px] bg-[#c8102e]" />
        {sub ? subLabel(sub, lang) : familyName(family, lang)}
      </h2>
    </>
  );
}

export async function ProductsIndex({ lang = "en" }: { lang?: Lang }) {
  const categories = getCategories();
  const base = baseOf(lang);
  // Per-page count is an operator-editable setting (高级管理 → 站点设置).
  const settings = await getSiteSettings();
  const perPage = settingNumber(settings, "products_per_page", 9);

  // Pre-compute the cards on the server; the grid itself is a client component
  // so it can paginate (18 families no longer fit on one screen without the
  // last rows being cut off).
  const familyCards = categories.map((family) => {
    const items = familyProducts(family);
    const lead = items.find((item) => (item.gallery ?? []).length > 0);
    return {
      key: family.sourceId,
      href: `${base}/products/${family.sourceId}`,
      title: familyName(family, lang),
      image: lead?.gallery?.[0] ? productImageUrl(lead.gallery[0]) : "",
      itemCount: items.length,
      names: items.slice(0, 5).map((item) => itemName(item, lang)),
    };
  });

  return (
    <>
      <PageHero
        breadcrumb={[pick(lang, "Products", "产品中心")]}
        lang={lang}
        subtitle={
          lang === "zh"
            ? `${categories.length} 个产品大类、${productCount()} 个产品详情，与源站完全一致，并附技术资料 PDF 下载。`
            : `${categories.length} product families and ${productCount()} individual products — mirrored 1:1 from the legacy catalogue, with the original technical PDFs.`
        }
        title={pick(lang, "Product Center", "产品中心")}
      />
      <section className="py-12">
        <div className="mx-auto w-full max-w-[1560px] px-4">
          <ProductFamilyGrid
            // Remount when the result set changes so the pager returns to page 1.
            key={familyCards.length}
            families={familyCards}
            lang={lang}
            perPage={perPage}
          />
        </div>
      </section>
      <AllPdfsSection lang={lang} />
    </>
  );
}

/** Mirrors product.php?top_id=<t>&c_id=<t> — sub categories + every product of the family. */
export function ProductCategoryPage({ category, lang = "en" }: { category: ProductFamily; lang?: Lang }) {
  const base = baseOf(lang);
  const items = familyProducts(category);
  const cards = items.map((item) =>
    toCard(
      item,
      `${base}/products/${category.sourceId}/${item.sourceId}`,
      category.subs.find((sub) => sub.items.some((p) => p.sourceId === item.sourceId)),
      lang,
    ),
  );
  return (
    <>
      <PageHero
        breadcrumb={[pick(lang, "Products", "产品中心"), familyName(category, lang)]}
        lang={lang}
        subtitle={`${items.length} ${pick(lang, "products in this family", "款产品")} · ${category.subs.length} ${pick(
          lang,
          "sub categories",
          "个子分类",
        )}`}
        title={familyName(category, lang)}
      />
      <section className="py-10">
        <div className="mx-auto w-full max-w-[1560px] px-4">
          <FamilyHeader family={category} lang={lang} />
          <div className="mt-8">
            <ProductListing cards={cards} lang={lang} />
          </div>
        </div>
      </section>
    </>
  );
}

/** Mirrors product.php?top_id=<t>&c_id=<sub> — one sub category, paginated. */
export function ProductSubPage({
  category,
  sub,
  lang = "en",
}: {
  category: ProductFamily;
  sub: ProductSub;
  lang?: Lang;
}) {
  const base = baseOf(lang);
  const items = subProducts(sub);
  const cards = items.map((item) =>
    toCard(item, `${base}/products/${category.sourceId}/${item.sourceId}`, sub, lang),
  );
  return (
    <>
      <PageHero
        breadcrumb={[
          pick(lang, "Products", "产品中心"),
          familyName(category, lang),
          subLabel(sub, lang),
        ]}
        lang={lang}
        subtitle={`${items.length} ${pick(lang, "products in this sub category", "款产品")}`}
        title={subLabel(sub, lang)}
      />
      <section className="py-10">
        <div className="mx-auto w-full max-w-[1560px] px-4">
          <FamilyHeader family={category} lang={lang} sub={sub} />
          <div className="mt-8">
            <ProductListing cards={cards} lang={lang} />
          </div>
        </div>
      </section>
    </>
  );
}

/** Mirrors product_show.php?c_id=<sub>&i_id=<item>. */
export function ProductDetail({
  category,
  product,
  lang = "en",
}: {
  category: ProductFamily;
  product: ProductItem;
  lang?: Lang;
}) {
  const base = baseOf(lang);
  const home = lang === "zh" ? "/zh" : "/";
  const sub = category.subs.find((item) => item.items.some((p) => p.sourceId === product.sourceId));
  const title = itemName(product, lang);
  const summary = itemSummary(product, lang, 400);
  const groupName = sub ? subLabel(sub, lang) : familyName(category, lang);
  const tabs: ProductTabItem[] = [
    {
      id: "description",
      label: pick(lang, "Description", "产品描述"),
      html: lang === "zh" && product.descriptionZh ? product.descriptionZh : product.description,
    },
    {
      id: "technical",
      label: pick(lang, "TECHNICAL PARAMETERS", "技术参数"),
      html: lang === "zh" && product.technicalZh ? product.technicalZh : product.technical,
    },
    {
      id: "offer",
      label: pick(lang, "OFFER DETAILS", "报价详情"),
      html: lang === "zh" && product.offerZh ? product.offerZh : product.offer,
    },
  ];
  const related = (sub ? subProducts(sub) : familyProducts(category))
    .filter((item) => item.sourceId !== product.sourceId)
    .slice(0, 6);
  return (
    <>
      <div className="border-b border-[#eee] bg-[#f8f8f8] py-3">
        <nav className="mx-auto w-full max-w-[1560px] px-4 text-[12px] text-[#777]">
          <Link className="hover:text-[#c8102e]" href={home}>
            {pick(lang, "Home", "首页")}
          </Link>
          <i className="mx-2">/</i>
          <Link className="hover:text-[#c8102e]" href={`${base}/products`}>
            {pick(lang, "Products", "产品中心")}
          </Link>
          <i className="mx-2">/</i>
          <Link className="hover:text-[#c8102e]" href={`${base}/products/${category.sourceId}`}>
            {groupName}
          </Link>
        </nav>
      </div>
      <section className="py-10">
        <div className="mx-auto w-full max-w-[1560px] px-4">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
            <ProductGallery
              images={product.gallery}
              noImageLabel={pick(lang, "Image unavailable", "暂无图片")}
              title={title}
            />
            <div className="border border-[#e8e8e8] bg-white p-6">
              <h1 className="text-[21px] font-bold leading-snug text-[#22262e]">{title}</h1>
              {summary ? <p className="mt-3 text-[13px] leading-[24px] text-[#777]">{summary}</p> : null}
              <dl className="mt-5 space-y-3 border-t border-[#f2f2f2] pt-5 text-[13px]">
                <div className="flex flex-wrap items-baseline gap-2">
                  <dt className="text-[#999]">{pick(lang, "Product code", "产品编码")}:</dt>
                  <dd className="font-bold text-[#333]">{product.code || "—"}</dd>
                </div>
                <div className="flex flex-wrap items-baseline gap-2">
                  <dt className="text-[#999]">{pick(lang, "Wholesale price", "批发价格")}:</dt>
                  <dd className="font-bold text-[#c8102e]">
                    <em>$</em>
                    {product.price || "—"}
                    {product.price ? <span className="ml-1 font-normal text-[#999]">/only</span> : null}
                  </dd>
                </div>
                <div className="flex flex-wrap items-baseline gap-2">
                  <dt className="text-[#999]">{pick(lang, "Family", "产品系列")}:</dt>
                  <dd className="text-[#333]">{familyName(category, lang)}</dd>
                </div>
              </dl>
              <div className="mt-5 flex flex-wrap gap-4 border-t border-[#f2f2f2] pt-4 text-[12px] text-[#999]">
                <a
                  className="hover:text-[#c8102e]"
                  href={`https://www.facebook.com/sharer.php?u=https://www.boppfilmsales.com${base}/products/${category.sourceId}/${product.sourceId}`}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {pick(lang, "Share facebook", "分享 facebook")}
                </a>
                <span>
                  {pick(lang, "Collection", "收藏")}
                </span>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-2">
                <a
                  className="border border-[#c8102e] bg-[#c8102e] py-[12px] text-center text-[12px] font-bold uppercase tracking-[1px] text-white hover:bg-[#a30d25]"
                  href="#product-details"
                >
                  {pick(lang, "Check Details", "查看详情")}
                </a>
                <Link
                  className="border border-[#c8102e] py-[12px] text-center text-[12px] font-bold uppercase tracking-[1px] text-[#c8102e] hover:bg-[#c8102e] hover:text-white"
                  href={`${base}/contact`}
                >
                  {pick(lang, "Chat Now", "立即咨询")}
                </Link>
              </div>
              {validProductPdfs(product).length > 0 ? (
                <div className="mt-6 border-t border-[#f2f2f2] pt-5">
                  <h3 className="text-[13px] font-bold uppercase tracking-[1px] text-[#c8102e]">
                    {pick(lang, "Technical Data", "技术资料")}
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {validProductPdfs(product).map((pdf) => (
                      <li key={pdf.file}>
                        <a
                          className="flex items-start gap-2 text-[12px] leading-[20px] text-[#666] hover:text-[#c8102e]"
                          href={pdf.file}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          <span className="mt-[2px] flex h-[22px] w-[22px] shrink-0 items-center justify-center bg-[#c8102e] text-[8px] font-black text-white">
                            PDF
                          </span>
                          <span>{pdf.label || pdf.file.split("/").pop()}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-8 scroll-mt-28" id="product-details">
            <ProductTabs inquiryHref={`${base}/contact`} lang={lang} tabs={tabs} />
          </div>

          {related.length > 0 ? (
            <div className="mt-12">
              <h2 className="flex items-center gap-3 border-b border-[#ececec] pb-3 text-[18px] font-bold text-[#22262e]">
                <i className="block h-[18px] w-[5px] bg-[#c8102e]" />
                {pick(lang, "related Products", "相关产品")}
              </h2>
              <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {related.map((item) => (
                  <li
                    className="group border border-[#e8e8e8] bg-white transition-all hover:-translate-y-[3px] hover:border-[#c8102e] hover:shadow-lg"
                    key={item.sourceId}
                  >
                    <Link
                      className="flex h-[190px] items-center justify-center overflow-hidden bg-[#f7f7f7]"
                      href={`${base}/products/${category.sourceId}/${item.sourceId}`}
                    >
                      {item.gallery?.[0] ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          alt={itemName(item, lang)}
                          className="h-full w-full object-contain"
                          src={productImageUrl(item.gallery[0])}
                        />
                      ) : (
                        <span className="text-[11px] text-[#b9bfc7]">{pick(lang, "No image", "暂无图片")}</span>
                      )}
                    </Link>
                    <div className="border-t border-[#f0f0f0] p-4">
                      <Link
                        className="line-clamp-2 text-[13px] font-bold leading-snug text-[#22262e] group-hover:text-[#c8102e]"
                        href={`${base}/products/${category.sourceId}/${item.sourceId}`}
                      >
                        {itemName(item, lang)}
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}

export type ContentKind = "about" | "lines" | "honor" | "service" | "cases";

export function ColumnStrip({ kind, activeId, lang }: { kind: ContentKind; activeId: number; lang: Lang }) {
  const base = baseOf(lang);
  const href = COLUMN_HREF[kind] ?? "/";
  const columns = getContents(kind);

  return (
    <div className="mb-2 grid grid-cols-2 overflow-hidden rounded border border-[#e5e7eb] bg-[#f3f4f6] md:grid-cols-4">
      {columns.map((column) => {
        const isActive = column.sourceId === activeId;
        const name = lang === "zh" ? contentNameZh(column.sourceId) ?? column.name : column.name;

        return (
          <Link
            key={column.sourceId}
            href={`${base}${href}?id=${column.sourceId}`}
            className={`px-3 py-3.5 text-center text-[13px] font-bold transition-colors ${
              isActive
                ? "bg-[#c8102e] text-white shadow-sm"
                : "bg-[#f3f4f6] text-[#374151] hover:bg-[#c8102e] hover:text-white"
            }`}
          >
            {name}
          </Link>
        );
      })}
    </div>
  );
}

function EmptyState({ lang }: { lang: Lang }) {
  return (
    <p className="border border-dashed border-[#e0e0e0] bg-[#fafafa] px-6 py-12 text-center text-[13px] text-[#888]">
      {pick(lang, "This column has no published item yet.", "此栏目暂无内容。")}
    </p>
  );
}

function CardGrid({
  kind,
  columnId,
  cards,
  lang,
  variant = "image",
}: {
  kind: ContentKind;
  columnId: number;
  cards: { sourceId: number; title: string; titleZh?: string; image: string; externalUrl?: string }[];
  lang: Lang;
  variant?: "image" | "logo";
}) {
  const box = variant === "logo" ? "h-[110px] p-3" : "h-[240px] p-4";
  return (
    <ul className={variant === "logo" ? "grid gap-4 sm:grid-cols-3 lg:grid-cols-4" : "grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}>
      {cards.map((card) => {
        const title = lang === "zh" && card.titleZh ? card.titleZh : card.title;
        const external = Boolean(card.externalUrl);
        const href = card.externalUrl || entryHref(kind, columnId, card.sourceId, lang);
        const inner = (
          <>
            <div className={`flex items-center justify-center bg-[#fafafa] ${box}`}>
              {card.image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img alt={title} className="max-h-full max-w-full object-contain" src={card.image} />
              ) : (
                <span className="text-[11px] font-bold text-[#b9bfc7]">{pick(lang, "No image", "暂无图片")}</span>
              )}
            </div>
            <div className="border-t border-[#f0f0f0] px-3 py-3 text-center text-[12px] font-bold leading-snug text-[#555] group-hover:text-[#c8102e]">
              {title}
            </div>
          </>
        );
        return (
          <li key={`${card.sourceId}-${title}`}>
            {external ? (
              <a
                className="group block overflow-hidden border border-[#eee] bg-white transition-all hover:-translate-y-1 hover:border-[#c8102e] hover:shadow-lg"
                href={href}
                rel="noopener noreferrer"
                target="_blank"
              >
                {inner}
              </a>
            ) : (
              <Link
                className="group block overflow-hidden border border-[#eee] bg-white transition-all hover:-translate-y-1 hover:border-[#c8102e] hover:shadow-lg"
                href={href}
              >
                {inner}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function LinesList({
  cards,
  entries,
  activeId,
  lang,
}: {
  cards: { sourceId: number; title: string; titleZh?: string; image: string; externalUrl?: string; hot?: boolean }[];
  entries: { sourceId: number; bodyHtml: string; bodyHtmlZh?: string }[];
  activeId: number;
  lang: Lang;
}) {
  const base = baseOf(lang);
  return (
    <ul className="space-y-6">
      {cards.map((card) => {
        const entry = entries.find((item) => item.sourceId === card.sourceId);
        const title = lang === "zh" && card.titleZh ? card.titleZh : card.title;
        const href = card.externalUrl || entryHref("lines", activeId, card.sourceId, lang);
        const text = lang === "zh" && entry?.bodyHtmlZh ? entry.bodyHtmlZh : entry?.bodyHtml ?? "";
        return (
          <li className="flex flex-col gap-5 border border-[#e8e8e8] bg-white p-5 md:flex-row" key={card.sourceId}>
            <Link
              className="flex h-[210px] w-full shrink-0 items-center justify-center overflow-hidden bg-[#fafafa] md:w-[330px]"
              href={href}
            >
              {card.image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img alt={title} className="max-h-full max-w-full object-contain" src={card.image} />
              ) : (
                <span className="text-[11px] font-bold text-[#b9bfc7]">{pick(lang, "No image", "暂无图片")}</span>
              )}
            </Link>
            <div className="min-w-0">
              <Link className="text-[16px] font-bold leading-snug text-[#22262e] hover:text-[#c8102e]" href={href}>
                {title}
                {card.hot ? (
                  <span className="ml-2 bg-[#c8102e] px-2 py-[2px] align-middle text-[10px] font-bold text-white">HOT</span>
                ) : null}
              </Link>
              <p className="mt-3 text-[13px] leading-[24px] text-[#666]">{stripHtml(text, 420)}</p>
              <Link
                href={`${base}/product-lines?id=${activeId}`}
                className="mt-3 inline-block text-[12px] font-bold text-[#c8102e] hover:underline"
              >
                {lang === "zh" ? "查看详情 →" : "VIEW MORE →"}
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function ContentColumnPage({
  kind,
  sourceId,
  content,
  lang = "en",
}: {
  kind: ContentKind;
  sourceId?: number;
  content?: SiteContent;
  lang?: Lang;
}) {
  const columns = getContents(kind);
  const active = content ?? (sourceId ? getContent(kind, sourceId) : undefined) ?? columns[0];
  if (!active) return <section className="py-16" />;
  const title = lang === "zh" ? contentNameZh(active.sourceId) ?? active.name : active.name;
  const sectionTitle = pick(lang, SECTION_TITLES[kind].en, SECTION_TITLES[kind].zh);
  const cards = contentCards(active);
  const entries = active.entries ?? [];

  let body = null;
  if (kind === "honor" || kind === "cases") {
    body = cards.length ? (
      <CardGrid cards={cards} columnId={active.sourceId} kind={kind} lang={lang} />
    ) : (
      <EmptyState lang={lang} />
    );
  } else if (kind === "service") {
    body = cards.length ? (
      <CardGrid cards={cards} columnId={active.sourceId} kind={kind} lang={lang} variant="logo" />
    ) : (
      <EmptyState lang={lang} />
    );
  } else if (kind === "lines") {
    body = cards.length ? <LinesList cards={cards} entries={entries} activeId={active.sourceId} lang={lang} /> : <EmptyState lang={lang} />;
  } else {
    const images = contentImages(active);
    const html = contentBody(active, lang);
    body = (
      <>
        {images.length > 0 ? (
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((image) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                alt=""
                className="max-h-[320px] w-full border border-[#eee] bg-[#fafafa] object-contain"
                key={image}
                src={image}
              />
            ))}
          </div>
        ) : null}
        {html ? (
          <div
            className="news-body text-[14px] leading-[190%] text-[#3d3d3d]"
            dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(html) }}
          />
        ) : (
          <EmptyState lang={lang} />
        )}
      </>
    );
  }

  return (
    <>
      <PageHero breadcrumb={[sectionTitle]} lang={lang} title={title} />
      <section className="py-10">
        <div className="mx-auto w-full max-w-[1560px] px-4">
          <ColumnStrip activeId={active.sourceId} kind={kind} lang={lang} />
          <div className="mt-8">{body}</div>
        </div>
      </section>
    </>
  );
}

export function ContentEntryPage({
  kind,
  columnId,
  sourceId,
  content,
  lang = "en",
}: {
  kind: ContentKind;
  columnId: string | number;
  sourceId: string | number;
  content?: SiteContent;
  lang?: Lang;
}) {
  const column = content ?? getContent(kind, columnId);
  const entry = column?.entries?.find((item) => String(item.sourceId) === String(sourceId));
  if (!column || !entry) return null;
  const card = contentCards(column).find((item) => String(item.sourceId) === String(sourceId));
  const title = lang === "zh" && entry.titleZh ? entry.titleZh : entry.title || column.name;
  const html = lang === "zh" && entry.bodyHtmlZh ? entry.bodyHtmlZh : entry.bodyHtml;
  const date = lang === "zh" && entry.dateZh ? entry.dateZh : entry.date;
  const sectionTitle = pick(lang, SECTION_TITLES[kind].en, SECTION_TITLES[kind].zh);
  return (
    <>
      <PageHero
        breadcrumb={[sectionTitle, column.name]}
        lang={lang}
        subtitle={date ? `Time: ${date}` : undefined}
        title={title}
      />
      <section className="py-10">
        <div className="mx-auto w-full max-w-[1200px] px-4">
          <div className="border border-[#e8e8e8] bg-white p-6 md:p-10">
            {html ? (
              <div
                className="news-body text-[14px] leading-[190%] text-[#3d3d3d]"
                dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(html) }}
              />
            ) : card?.image ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img alt={title} className="mx-auto h-auto max-h-[720px] max-w-full object-contain" src={card.image} />
            ) : (
              <p className="text-[13px] text-[#888]">{pick(lang, "Content is being prepared.", "内容整理中。")}</p>
            )}
            <div className="mt-8 border-t border-[#f0f0f0] pt-6">
              <Link
                className="text-[12px] font-bold uppercase tracking-[1px] text-[#c8102e]"
                href={`${baseOf(lang)}${COLUMN_HREF[kind]}?id=${column.sourceId}`}
              >
                ← {pick(lang, "Back to the list", "返回列表")}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export function DownloadsPage({ lang = "en" }: { lang?: Lang }) {
  const groups = allDownloads();
  const productPdfs = allPdfs();
  return (
    <>
      <PageHero
        breadcrumb={[pick(lang, "Download", "下载中心")]}
        lang={lang}
        subtitle={
          lang === "zh"
            ? "公司公告、技术资料、证书与 MSDS，全部 PDF 集中下载。"
            : "Company notices, technology data, certificates and MSDS — every mirrored PDF in one place."
        }
        title={pick(lang, "Download Center", "下载中心")}
      />
      <section className="py-12">
        <div className="mx-auto w-full max-w-[1560px] space-y-10 px-4">
          {productPdfs.length > 0 ? (
            <div className="border border-[#e8e8e8] bg-white">
              <h2 className="border-b border-[#eee] bg-[#fafafa] px-6 py-4 text-[16px] font-bold text-[#22262e]">
                {pick(lang, "Product Technical Data", "产品技术资料")}
                <span className="ml-2 text-[12px] font-normal text-[#999]">{productPdfs.length} files</span>
              </h2>
              <ul className="divide-y divide-[#f2f2f2]">
                {productPdfs.map((pdf) => (
                  <li className="flex flex-wrap items-center gap-3 px-6 py-4" key={pdf.file}>
                    <span className="flex h-[34px] w-[30px] items-center justify-center bg-[#c8102e] text-[9px] font-black text-white">
                      PDF
                    </span>
                    <span className="min-w-0 flex-1 text-[13px] text-[#333]">{pdf.label || pdf.file.split("/").pop()}</span>
                    <a
                      className="inline-flex items-center gap-1.5 border border-[#c8102e] bg-[#c8102e] px-4 py-1.5 text-[12px] font-bold text-white hover:bg-[#a30d25]"
                      href={pdf.file}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {pick(lang, "Download PDF", "下载 PDF")}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}

export function AllPdfsSection({
  lang = "en",
  pdfs,
}: {
  lang?: Lang;
  pdfs?: { label: string; file: string; product: string }[];
}) {
  const productPdfs = pdfs ?? allPdfs();
  if (productPdfs.length === 0) return null;

  return (
    <section className="py-10 bg-[#f9fafb] border-t border-[#e5e7eb]">
      <div className="mx-auto w-full max-w-[1560px] px-4">
        <h2 className="text-[18px] font-bold text-[#22262e] mb-6 flex items-center gap-3">
          <span className="w-[5px] h-[18px] bg-[#c8102e] block" />
          {lang === "zh" ? "全部技术 PDF 资料" : "All Technical PDFs"}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {productPdfs.slice(0, 12).map((pdf) => (
            <a
              key={pdf.file}
              href={pdf.file}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 bg-white border border-[#e8e8e8] hover:border-[#c8102e] hover:shadow-md transition-all group"
            >
              <span className="flex h-[32px] w-[28px] shrink-0 items-center justify-center bg-[#c8102e] text-[9px] font-black text-white">
                PDF
              </span>
              <span className="truncate text-[12px] text-[#333] group-hover:text-[#c8102e]">
                {pdf.label || pdf.file.split("/").pop()}
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}