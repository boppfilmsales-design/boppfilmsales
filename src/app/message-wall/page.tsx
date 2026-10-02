import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { PageHero } from "@/components/pages/ArticleChrome";
import {
  displayName,
  fmtMessageDate,
  getPublicMessages,
} from "@/lib/message-wall";

/**
 * 实时渲染：后台改完内容，前台立刻生效。
 *
 * 2026-10-02 之前这里是 `revalidate = 60`（增量缓存 60 秒）。当时的理由是免费版
 * Workers 只有 10 毫秒 CPU 预算，而 `force-dynamic` 会让每次访问都重建整棵页面树
 * 并重扫 D1，进而触发 Error 1102（Worker exceeded resource limits）。
 *
 * 现已升级 Workers Paid（30 秒 CPU / 请求，额度是免费版的 3000 倍），所以改回
 * 实时渲染。代价是每次访问都会读一次 D1。
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Customer Message Wall - Asia Pacific Industry Group",
  description:
    "Messages and enquiries from customers of Asia Pacific Industry Group Co., Limited — BOPP / BOPET film, tape and thermal laminating film.",
};

/**
 * 客户留言墙 —— 列表页。
 *
 * 2026-10-02 改版：样式与「新闻中心 → Employees Literary」完全一致
 * （左侧图片/头像位 + 右侧内容块，点 MORE 进详情页）。
 * 每条留言的详情在 /message-wall/<id>。
 *
 * 隐私：邮箱与电话从不参与查询（见 @/lib/message-wall），
 * 且只有 is_public 且 status='replied' 的留言才会出现。
 */
export default async function MessageWallPage() {
  const messages = await getPublicMessages();

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="Contact" />

      <PageHero breadcrumb={["Message Wall"]} title="Message Wall" />

      <section className="py-10">
        <div className="mx-auto w-full max-w-[1560px] px-4">
          <p className="mx-auto mb-8 max-w-[820px] text-center text-[16px] leading-[30px] text-[#777]">
            Enquiries we have received and answered. Contact details are kept private.
          </p>

          {messages.length === 0 ? (
            <p className="border border-dashed border-[#e0e0e0] bg-[#fafafa] px-6 py-12 text-center text-[16px] text-[#888]">
              No messages have been published yet.
            </p>
          ) : (
            <ul className="space-y-[30px]">
              {messages.map((row) => {
                const name = displayName(row.company, row.contact);
                const href = `/message-wall/${row.id}`;
                return (
                  <li className="group" key={row.id}>
                    <div className="flex flex-col gap-0 md:flex-row">
                      {/* 头像位 —— 与新闻列表的图片位同尺寸，保证两处排版完全一致 */}
                      <div className="flex h-[220px] w-[260px] max-w-full shrink-0 items-center justify-center bg-[linear-gradient(135deg,#c8102e,#8d0b20)]">
                        <span className="text-[64px] font-black leading-none text-white/90">
                          {name.slice(0, 1).toUpperCase()}
                        </span>
                      </div>

                      <div className="box-border min-h-[220px] flex-1 bg-[#f8f8f8] p-[28px]">
                        <h2 className="mb-[8px] truncate text-[16px] font-bold text-[#333] group-hover:text-[#c8102e]">
                          <Link href={href}>{name}</Link>
                        </h2>
                        <span className="text-[16px] text-[#666]">
                          Time: {fmtMessageDate(row.createdAt)}
                        </span>
                        <p className="mt-[15px] border-t border-[#dfdfdf] pt-[15px] text-[16px] leading-[26px] text-[#666] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden">
                          {row.message}
                        </p>
                        <Link
                          className="float-right text-[16px] font-bold uppercase text-[#666] transition-all duration-500 group-hover:mr-[10px] group-hover:text-[#c8102e]"
                          href={href}
                        >
                          MORE
                        </Link>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-10 text-center">
            <Link
              className="inline-block border border-[#c8102e] bg-white px-7 py-2.5 text-[16px] font-medium text-[#c8102e] transition hover:bg-[#c8102e] hover:text-white"
              href="/contact"
            >
              Send us your message
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
