import Link from "next/link";
import Pagination from "@/components/Pagination";
import { ColumnStrip, PageHero } from "@/components/pages/ArticleChrome";
import type { ArticleColumn } from "@/lib/article-columns";
import { PER_PAGE, formatListDate, listPosts, resolveCategory, toPlainExcerpt } from "@/lib/news";

export const dynamic = "force-dynamic";

type Lang = "en" | "zh";

/**
 * A 案例 / 服务 column rendered from `news_posts`.
 *
 * These columns used to be *static* lists, which meant the admin panel had no
 * usable editor for them. They are now backed by `news_posts` — exactly like
 * 新闻中心 → Employees Literary — so the admin gets "+ 添加信息" plus the full
 * rich-text article editor, and articles are reachable at /news/<slug>/<id>.
 *
 * 2026-10-02: 把列表部分抽成 `ArticleColumnList`，好让 /contact 这种
 * 「自己有一整页版式、只想嵌入同一套列表」的页面也能复用 —— 这样联系方式的
 * 样式与新闻中心完全一致，而后台一改前台立刻生效。
 */

/**
 * 栏目文章列表（不含 PageHero / ColumnStrip）。
 *
 * `/contact` 用它把后台「联系我们 → General Information」的 8 篇文章渲染成
 * 与新闻中心一致的列表；点进去是同一个详情页 /news/general-information/<id>。
 */
export async function ArticleColumnList({
  column,
  lang = "en",
  page = 1,
  showPagination = false,
}: {
  column: ArticleColumn;
  lang?: Lang;
  page?: number;
  /** 首页/联系页这类嵌入场景不需要分页条。 */
  showPagination?: boolean;
}) {
  const category = await resolveCategory(column.slug);
  const slug = category?.slug ?? column.slug;
  const result = await listPosts({ categoryId: category?.id, page, perPage: PER_PAGE });
  const current = Math.min(Math.max(1, page), result.pages);
  const base = lang === "zh" ? `/zh${column.href}` : column.href;
  const zh = lang === "zh";

  if (result.items.length === 0) {
    return (
      <p className="border border-dashed border-[#e0e0e0] bg-[#fafafa] px-6 py-12 text-center text-[13px] text-[#888]">
        {zh
          ? `此栏目暂无内容，请到后台「内容管理 → ${column.sectionZh} → ${column.nameEn}」添加。`
          : `No records published in this column yet. Add one from Admin → Content → ${column.sectionEn} → ${column.nameEn}.`}
      </p>
    );
  }

  return (
    <>
      <ul className="space-y-[30px]">
        {result.items.map((post) => {
          const href = `/news/${slug}/${post.id}`;
          return (
            <li className="group" key={post.id}>
              <div className="flex flex-col gap-0 md:flex-row">
                <div className="h-[220px] w-[260px] max-w-full shrink-0 overflow-hidden bg-[#f2f2f2]">
                  <Link className="block h-full w-full overflow-hidden" href={href}>
                    {post.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt={post.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.08]"
                        src={post.image}
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-[linear-gradient(135deg,#f2f2f2,#e2e2e2)] text-[12px] font-bold tracking-[2px] text-[#bbb]">
                        <span className="text-[24px] font-light text-[#cfcfcf]">AP</span>
                        NO PHOTO
                      </div>
                    )}
                  </Link>
                </div>
                <div className="box-border min-h-[220px] flex-1 bg-[#f8f8f8] p-[28px]">
                  <h2 className="mb-[8px] truncate text-[16px] font-bold text-[#333] group-hover:text-[#c8102e]">
                    {post.isPinned ? (
                      <span className="mr-2 bg-[#e61d39] px-1.5 py-[2px] align-middle text-[10px] font-bold text-white">
                        {zh ? "置顶" : "PINNED"}
                      </span>
                    ) : null}
                    <Link href={href}>{post.title}</Link>
                  </h2>
                  <span className="text-[13px] text-[#666]">
                    {zh ? "时间：" : "Time: "}
                    {formatListDate(post.listDate, post.sortDate)}
                  </span>
                  <p className="mt-[15px] border-t border-[#dfdfdf] pt-[15px] text-[13px] leading-[24px] text-[#666] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden">
                    {post.excerpt || toPlainExcerpt(post.bodyHtml, post.bodyText)}
                  </p>
                  <Link
                    className="float-right text-[13px] font-bold uppercase text-[#666] transition-all duration-500 group-hover:mr-[10px] group-hover:text-[#c8102e]"
                    href={href}
                  >
                    {zh ? "查看详情" : "MORE"}
                  </Link>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {showPagination && result.items.length > 0 ? (
        <div className="mt-8">
          <Pagination
            buildHref={(target) => `${base}?id=${column.sourceId}&p=${target}`}
            page={current}
            pages={result.pages}
            perPage={PER_PAGE}
            total={result.total}
          />
        </div>
      ) : null}
    </>
  );
}

/** 完整的栏目页：面包屑 + 栏目切换条 + 列表 + 分页。 */
export default async function ArticleColumnPage({
  column,
  lang = "en",
  page = 1,
}: {
  column: ArticleColumn;
  lang?: Lang;
  page?: number;
}) {
  const zh = lang === "zh";
  const title = zh ? column.nameZh : column.nameEn;

  return (
    <>
      <PageHero
        breadcrumb={[zh ? column.sectionZh : column.sectionEn]}
        lang={lang}
        title={title}
      />
      <section className="py-10">
        <div className="mx-auto w-full max-w-[1560px] px-4">
          <ColumnStrip activeId={column.sourceId} kind={column.kind} lang={lang} />
          <div className="mt-8">
            <ArticleColumnList column={column} lang={lang} page={page} showPagination />
          </div>
        </div>
      </section>
    </>
  );
}
