import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { getCategories, listPosts } from "@/lib/news";

export const metadata: Metadata = {
  title: "Search - Asia Pacific Industry Group Co., Limited",
};

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ keyWord?: string }>;
}) {
  const { keyWord } = await searchParams;
  const keyword = (keyWord ?? "").trim();
  const [{ items, total }, categories] = await Promise.all([
    listPosts({ search: keyword, perPage: 20 }),
    getCategories(),
  ]);
  const slugById = new Map(categories.map((c) => [c.id, c.slug]));

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <section className="border-b border-[#f0f0f0] bg-[#fafafa]">
        <div className="mx-auto w-full max-w-[1200px] px-3">
          <p className="text-[14px] leading-[55px] text-[#666]">
            <span className="mr-2 inline-block h-[14px] w-[3px] bg-[#e61d39] align-middle" />
            <span className="font-bold text-[#e61d39]">Home</span> / Search
          </p>
        </div>
      </section>
      <section className="py-12">
        <div className="mx-auto w-full max-w-[1000px] px-3">
          <h1 className="text-center text-[24px] font-bold text-[#333]">
            Search result for &ldquo;{keyword}&rdquo; — {total} record(s)
          </h1>
          <form action="/search" className="mx-auto mt-6 flex max-w-[520px] border border-[#ddd]" method="get">
            <input
              className="h-[38px] flex-1 px-3 text-[13px] outline-none"
              defaultValue={keyword}
              name="keyWord"
              placeholder="Input keyword..."
            />
            <button className="bg-[#e61d39] px-5 text-[13px] font-bold text-white" type="submit">
              Search
            </button>
          </form>
          <ul className="mt-10 divide-y divide-[#eee] border border-[#eee]">
            {items.map((post) => (
              <li className="p-5" key={post.id}>
                <Link
                  className="text-[15px] font-bold text-[#333] hover:text-[#e61d39]"
                  href={`/news/${slugById.get(post.categoryId) ?? "news"}/${post.id}`}
                >
                  {post.title}
                </Link>
                <p className="mt-2 text-[13px] leading-[24px] text-[#777]">{post.excerpt}</p>
              </li>
            ))}
            {items.length === 0 && (
              <li className="p-8 text-center text-[13px] text-[#888]">
                Nothing found. Please try another keyword, or browse the News center.
              </li>
            )}
          </ul>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
