import type { Metadata } from "next";
import Link from "next/link";
import Pagination from "@/components/Pagination";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { PER_PAGE, PUBLIC_NEWS_SLUGS, formatListDate, getCategories, getCategoryCounts, listPosts, resolveCategory, toPlainExcerpt } from "@/lib/news";

export const metadata: Metadata = {
  title: "News - Asia Pacific Industry Group Co., Limited",
  description:
    "Industry News, Company News and Employees Literary from Asia Pacific Industry Group Co., Limited (www.apigcl.com / www.boppfilmsales.com).",
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ category?: string; c_id?: string; p?: string; page?: string }>;

function NoPhoto() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[linear-gradient(135deg,#f2f2f2,#e2e2e2)] text-[12px] font-bold tracking-[2px] text-[#bbb]">
      <span className="text-[26px] font-light text-[#cfcfcf]">AP</span>
      NO PHOTO
    </div>
  );
}

export default async function NewsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const categories = (await getCategories()).filter((c) => PUBLIC_NEWS_SLUGS.includes(c.slug));
  const requested = sp.category ?? sp.c_id ?? null;
  const resolved = await resolveCategory(requested);
  // 案例 / 服务 article columns reuse the news tables — never surface them here.
  const active =
    resolved && PUBLIC_NEWS_SLUGS.includes(resolved.slug) ? resolved : (categories[0] ?? null);
  const page = Number.parseInt(sp.p ?? sp.page ?? "1", 10) || 1;

  const result = await listPosts({ categoryId: active?.id, page, perPage: PER_PAGE });
  const counts = await getCategoryCounts();

  const current = Math.min(Math.max(1, page), result.pages);

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="News" />

      {/* Breadcrumb bar — mirrors #n_title / #position of the legacy site */}
      <section className="border-b border-[#f0f0f0] bg-[#fafafa]">
        <div className="mx-auto w-full max-w-[1200px] px-3">
          <div className="flex items-center gap-2 text-[14px] leading-[55px] text-[#666]">
            <span className="inline-block h-[14px] w-[3px] bg-[#e61d39]" />
            <Link className="text-[#e61d39] hover:underline" href="/">
              Home
            </Link>
            <i className="text-[#999] not-italic">/</i>
            <Link className="hover:underline" href="/news">
              News
            </Link>
            {active ? (
              <>
                <i className="text-[#999] not-italic">/</i>
                <span>{active.name}</span>
              </>
            ) : null}
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="mx-auto w-full max-w-[1200px] px-3">
          <article className="n_article">
            <h1 className="text-center text-[30px] font-bold uppercase text-[#e61d39]">NEWS</h1>
            <i className="mx-auto mt-[15px] block h-[5px] w-[92px] bg-[#e61d39]" />
          </article>

          {/* Category tabs: Industry News / Company News / Employees Literary */}
          <ul className="mt-10 grid gap-[5px] sm:grid-cols-3">
            {categories.map((category) => {
              const isActive = active?.id === category.id;
              return (
                <li key={category.id} className="min-w-0">
                  <Link
                    className={`block h-[40px] truncate px-[10px] text-[14px] font-bold leading-[40px] transition-colors duration-300 ${
                      isActive
                        ? "bg-[#e61d39] text-white"
                        : "bg-[#eee] text-[#666] hover:bg-[#e61d39] hover:text-white"
                    }`}
                    href={`/news?category=${category.slug}`}
                  >
                    {category.name} <span className="text-[11px] font-normal opacity-80">({counts[category.id] ?? 0})</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <ul className="mt-[50px] space-y-[50px]">
            {result.items.map((post) => (
              <li className="group" key={post.id}>
                <div className="flex flex-col gap-0 md:flex-row">
                  <div className="h-[260px] w-[260px] max-w-full shrink-0 overflow-hidden">
                    <Link href={`/news/${active?.slug ?? "news"}/${post.id}`} className="block h-full w-full overflow-hidden">
                      {post.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          alt={post.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.2]"
                          src={post.image}
                        />
                      ) : (
                        <NoPhoto />
                      )}
                    </Link>
                  </div>
                  <div className="box-border h-auto min-h-[260px] flex-1 bg-[#f8f8f8] p-[40px] md:h-[260px]">
                    <h1 className="mt-[20px] mb-[10px] truncate text-[16px] text-[#333] group-hover:text-[#e61d39]">
                      <Link href={`/news/${active?.slug ?? "news"}/${post.id}`}>{post.title}</Link>
                    </h1>
                    <span className="text-[13px] text-[#666]">
                      Time: {formatListDate(post.listDate, post.sortDate)}
                    </span>
                    <p className="mt-[15px] border-t border-[#dfdfdf] pt-[15px] text-[13px] leading-[24px] text-[#666] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden">
                      {post.excerpt || toPlainExcerpt(post.bodyHtml, post.bodyText)}
                    </p>
                    <Link
                      className="float-right mr-0 text-[13px] font-bold uppercase text-[#666] transition-all duration-500 group-hover:mr-[10px] group-hover:text-[#e61d39]"
                      href={`/news/${active?.slug ?? "news"}/${post.id}`}
                    >
                      MORE
                    </Link>
                  </div>
                </div>
              </li>
            ))}

            {result.items.length === 0 && (
              <li className="border border-dashed border-[#e0e0e0] bg-[#fafafa] p-10 text-center text-[13px] text-[#888]">
                No records published in this column yet.
              </li>
            )}
          </ul>

          {result.items.length > 0 && (
            <Pagination
              buildHref={(target) =>
                `/news?category=${active?.slug ?? ""}&p=${target}`
              }
              page={current}
              pages={result.pages}
              perPage={PER_PAGE}
              total={result.total}
            />
          )}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
