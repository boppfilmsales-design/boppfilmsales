import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { getNeighbourPosts, getPostById, resolveCategory } from "@/lib/news";
import { sanitizeRichHtml } from "@/lib/rich-text";

export const dynamic = "force-dynamic";

type Params = Promise<{ category: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const post = await getPostById(Number.parseInt(id, 10));
  return {
    title: post ? `${post.title} - News - Asia Pacific Industry Group` : "News - Asia Pacific Industry Group",
    description: post?.excerpt || undefined,
  };
}

export default async function NewsDetailPage({ params }: { params: Params }) {
  const { category, id } = await params;
  const post = await getPostById(Number.parseInt(id, 10));
  if (!post) notFound();

  const activeCategory = await resolveCategory(category);
  const neighbours = await getNeighbourPosts(post);
  const displayDate = post.newsDate || post.listDate;
  const listHref = `/news?category=${activeCategory?.slug ?? "industry-news"}`;

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="News" />

      <section className="border-b border-[#f0f0f0] bg-[#fafafa]">
        <div className="mx-auto w-full max-w-[1200px] px-3">
          <div className="flex items-center gap-2 text-[14px] leading-[55px] text-[#666]">
            <span className="inline-block h-[14px] w-[3px] bg-[#e61d39]" />
            <Link className="text-[#e61d39] hover:underline" href="/">
              Home
            </Link>
            <i className="text-[#999] not-italic">/</i>
            <Link className="text-[#e61d39] hover:underline" href="/news">
              News
            </Link>
            <i className="text-[#999] not-italic">/</i>
            <Link className="hover:underline" href={listHref}>
              {activeCategory?.name ?? "Industry News"}
            </Link>
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="mx-auto w-full max-w-[1200px] px-3">
          <article>
            <h1 className="text-center text-[26px] font-bold uppercase text-[#e61d39] md:text-[30px]">
              {post.title}
            </h1>
            <i className="mx-auto mt-[15px] block h-[5px] w-[92px] bg-[#e61d39]" />
            <div className="mx-auto my-[30px] border-b border-[#eee] pb-3 text-center text-[13px] text-[#666]">
              Time：{displayDate}
            </div>
            <div
              className="news-body min-h-[500px] text-[14px] leading-[150%] text-[#4b4b4b]"
              dangerouslySetInnerHTML={{
                __html: sanitizeRichHtml(post.bodyHtml) || `<p>${post.excerpt}</p>`,
              }}
            />
          </article>

          <div className="mt-10 flex flex-col gap-3 border-t border-[#eee] pt-6 text-[13px] text-[#666] md:flex-row md:justify-between">
            <div className="space-y-1">
              <div>
                Previous :{" "}
                {neighbours.prev ? (
                  <Link
                    className="text-[#e61d39] hover:underline"
                    href={`/news/${activeCategory?.slug ?? "news"}/${neighbours.prev.id}`}
                  >
                    {neighbours.prev.title}
                  </Link>
                ) : (
                  <span className="text-[#aaa]">no more</span>
                )}
              </div>
              <div>
                Next :{" "}
                {neighbours.next ? (
                  <Link
                    className="text-[#e61d39] hover:underline"
                    href={`/news/${activeCategory?.slug ?? "news"}/${neighbours.next.id}`}
                  >
                    {neighbours.next.title}
                  </Link>
                ) : (
                  <span className="text-[#aaa]">no more</span>
                )}
              </div>
            </div>
            <Link
              className="self-start border border-[#e61d39] px-4 py-[6px] text-[13px] font-bold text-[#e61d39] hover:bg-[#e61d39] hover:text-white"
              href={listHref}
            >
              Back to {activeCategory?.name ?? "News"} &gt;&gt;
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
