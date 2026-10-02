import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { sanitizeRichHtml } from "@/lib/rich-text";
import {
  displayName,
  fmtMessageDate,
  getNeighbourMessages,
  getPublicMessage,
} from "@/lib/message-wall";

/** 与列表页一致：实时渲染，后台改完立刻生效。 */
export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const row = await getPublicMessage(Number.parseInt(id, 10));
  if (!row) return { title: "Message Wall - Asia Pacific Industry Group" };
  const name = displayName(row.company, row.contact);
  return {
    title: `${name} - Message Wall - Asia Pacific Industry Group`,
    description: row.message.slice(0, 160),
  };
}

/**
 * 留言详情页 —— 与「新闻详情页」(/news/<slug>/<id>) 同一套版式：
 * 面包屑 → 居中标题 → 时间 → 富文本正文 → 上下条导航 → 返回按钮。
 *
 * 运营的回复以引用块形式展示在正文下方。
 */
export default async function MessageDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const row = await getPublicMessage(Number.parseInt(id, 10));
  if (!row) notFound();

  const name = displayName(row.company, row.contact);
  const neighbours = await getNeighbourMessages(row.id);

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="Contact" />

      <section className="border-b border-[#f0f0f0] bg-[#fafafa]">
        <div className="mx-auto w-full max-w-[1200px] px-3">
          <div className="flex flex-wrap items-center gap-2 text-[16px] leading-[55px] text-[#666]">
            <span className="inline-block h-[14px] w-[3px] bg-[#e61d39]" />
            <Link className="text-[#e61d39] hover:underline" href="/">
              Home
            </Link>
            <i className="text-[#999] not-italic">/</i>
            <Link className="text-[#e61d39] hover:underline" href="/message-wall">
              Message Wall
            </Link>
            <i className="text-[#999] not-italic">/</i>
            <span className="truncate">{name}</span>
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="mx-auto w-full max-w-[1200px] px-3">
          <article>
            <h1 className="text-center text-[26px] font-bold uppercase text-[#e61d39] md:text-[30px]">
              {name}
            </h1>
            <i className="mx-auto mt-[15px] block h-[5px] w-[92px] bg-[#e61d39]" />
            <div className="mx-auto my-[30px] border-b border-[#eee] pb-3 text-center text-[16px] text-[#666]">
              Time：{fmtMessageDate(row.createdAt)}
            </div>

            {/* 客户留言正文。老数据是纯文本，新数据是富文本 —— 两种情况都要好看。 */}
            <div
              className="news-body min-h-[220px] leading-[170%] text-[#4b4b4b]"
              dangerouslySetInnerHTML={{ __html: renderBody(row.message) }}
            />

            {row.reply ? (
              <div className="mt-8 border-l-[4px] border-[#c8102e] bg-[#fdf6f7] px-5 py-4">
                <p className="text-[16px] font-bold text-[#c8102e]">Reply from Asia Pacific</p>
                {row.repliedAt ? (
                  <p className="mt-1 text-[14px] text-[#999]">{fmtMessageDate(row.repliedAt)}</p>
                ) : null}
                <div
                  className="news-body mt-3 leading-[170%] text-[#4b4b4b]"
                  dangerouslySetInnerHTML={{ __html: renderBody(row.reply) }}
                />
              </div>
            ) : null}
          </article>

          <div className="mt-10 flex flex-col gap-3 border-t border-[#eee] pt-6 text-[16px] text-[#666] md:flex-row md:justify-between">
            <div className="space-y-1">
              <div>
                Previous :{" "}
                {neighbours.prev ? (
                  <Link className="text-[#e61d39] hover:underline" href={`/message-wall/${neighbours.prev.id}`}>
                    {displayName(neighbours.prev.company, neighbours.prev.contact)}
                  </Link>
                ) : (
                  <span className="text-[#aaa]">no more</span>
                )}
              </div>
              <div>
                Next :{" "}
                {neighbours.next ? (
                  <Link className="text-[#e61d39] hover:underline" href={`/message-wall/${neighbours.next.id}`}>
                    {displayName(neighbours.next.company, neighbours.next.contact)}
                  </Link>
                ) : (
                  <span className="text-[#aaa]">no more</span>
                )}
              </div>
            </div>
            <Link
              className="self-start border border-[#e61d39] px-4 py-[6px] text-[16px] font-bold text-[#e61d39] hover:bg-[#e61d39] hover:text-white"
              href="/message-wall"
            >
              Back to Message Wall &gt;&gt;
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

/**
 * 留言正文渲染。
 *
 * 升级富文本之前，`inquiries.message` / `reply` 存的是纯文本；升级后是 HTML。
 * 老数据不能因为换渲染方式就变成一坨 —— 含标签的按 HTML 处理（并过一遍
 * sanitizeRichHtml），不含标签的按纯文本处理并保留换行。
 */
function renderBody(value: string): string {
  const text = String(value ?? "");
  if (!text) return "";
  const isHtml = /<(p|div|br|span|strong|em|u|ul|ol|li|h[1-6]|table|img|a|blockquote)\b/i.test(text);
  if (!isHtml) {
    return text
      .split(/\r?\n/)
      .map((line) => (line.trim() ? `<p>${escapeHtml(line)}</p>` : ""))
      .join("");
  }
  return sanitizeRichHtml(text);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
