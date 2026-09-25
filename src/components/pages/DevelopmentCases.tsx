import Link from "next/link";
import Pagination from "@/components/Pagination";
import { ColumnStrip, PageHero } from "@/components/pages/Sections";
import { PER_PAGE, formatListDate, listPosts, resolveCategory, toPlainExcerpt } from "@/lib/news";

export const dynamic = "force-dynamic";

type Lang = "en" | "zh";

/**
 * 案例 → Development Cases.
 *
 * This column used to be a *static* "image-list" column with zero rows, which
 * meant the admin panel had nothing to open and operators could never publish
 * into it. It is now backed by `news_posts` (category `development-cases`),
 * exactly like 新闻中心 → Employees Literary, so the admin gets
 * "+ 添加信息" plus the full rich-text article editor, and articles are
 * reachable at /news/development-cases/<id>.
 */
export default async function DevelopmentCasesPage({
  lang = "en",
  page = 1,
}: {
  lang?: Lang;
  page?: number;
}) {
  const category = await resolveCategory("development-cases");
  const slug = category?.slug ?? "development-cases";
  const result = await listPosts({ categoryId: category?.id, page, perPage: PER_PAGE });
  const current = Math.min(Math.max(1, page), result.pages);
  const base = lang === "zh" ? "/zh/cases" : "/cases";
  const zh = lang === "zh";

  return (
    <>
      <PageHero
        breadcrumb={[zh ? "经典案例" : "Classic Cases"]}
        lang={lang}
        title={zh ? "发展案例" : "Development Cases"}
      />
      <section className="py-10">
        <div className="mx-auto w-full max-w-[1560px] px-4">
          <ColumnStrip activeId={54} kind="cases" lang={lang} />

          <div className="mt-8">
            {result.items.length === 0 ? (
              <p className="border border-dashed border-[#e0e0e0] bg-[#fafafa] px-6 py-12 text-center text-[13px] text-[#888]">
                {zh
                  ? "此栏目暂无内容，请到后台「内容管理 → 案例 → Development Cases」添加。"
                  : "No records published in this column yet. Add one from Admin → Content → Cases → Development Cases."}
              </p>
            ) : (
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
            )}

            {result.items.length > 0 ? (
              <div className="mt-8">
                <Pagination
                  buildHref={(target) => `${base}?id=54&p=${target}`}
                  page={current}
                  pages={result.pages}
                  perPage={PER_PAGE}
                  total={result.total}
                />
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}
