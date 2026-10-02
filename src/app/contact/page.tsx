import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import InquiryForm from "@/components/InquiryForm";
import { ContactInfoList } from "@/components/pages/ArticleColumn";
import { getArticleColumn } from "@/lib/article-columns";
import { listPosts, resolveCategory } from "@/lib/news";

/**
 * 实时渲染：后台改完内容，前台立刻生效。
 *
 * 2026-10-02 之前这里是 `revalidate = 60`（增量缓存 60 秒）。当时的理由是免费版
 * Workers 只有 10 毫秒 CPU 预算，而 `force-dynamic` 会让每次访问都重建整棵页面树
 * 并重扫 D1，进而触发 Error 1102（Worker exceeded resource limits）。
 *
 * 现已升级 Workers Paid（30 秒 CPU / 请求，额度是免费版的 3000 倍），所以改回
 * 实时渲染。代价是每次访问都会读一次 D1 —— 首页那种一次读上百行的页面如果流量
 * 很大，要留意 D1 的每日读取额度。
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contact - Asia Pacific Industry Group Co., Limited",
  description:
    "Contact Asia Pacific Industry Group Co., Limited — BOPP / BOPET film, tape and thermal laminating film manufacturer in Hefei, China.",
};

/**
 * 联系我们页 —— 版式与旧站 contact.php 一致，内容由后台驱动。
 * =====================================================================
 * 演进过程（值得记下来，否则很容易又改错）：
 *
 *   ① 最初：整页联系方式**硬编码**在本文件里，后台另有 8 条 static 数据，
 *      两边互不相干 —— 后台改了前台不变，而且后台列表只显示「10 - TEXT」。
 *
 *   ② 第一次改造：后台改成富文本文章模式（对了），但前台也顺手换成了
 *      新闻卡片样式（NO PHOTO 灰块 + 时间 + 摘要）—— **错了**，联系方式
 *      不该长成新闻列表的样子。运营的原话：「前端网站不能这样显示，请恢复」。
 *
 *   ③ 现在：后台保持「一条一条」的文章列表（改一条不牵连别的），
 *      前台恢复传统的联系信息版式 —— 公司名 + 地址 + 两列信息网格 + 地图
 *      + 二维码 + 世界地图 + 留言表单，但**内容全部读后台文章**。
 *
 * 所以：`ContactInfoList` 读的是同一批文章，只是渲染成紧凑的信息行。
 */
const QR_IMAGES = [
  "/images/qr/qr1.jpg",
  "/images/qr/qr2.jpg",
  "/images/qr/qr3.jpg",
  "/images/qr/qr4.jpg",
];

const MAP_SRC =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3654.0!2d117.302891!3d31.806389!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzHCsDQ4JzIzLjAiTiAxMTfCsDE4JzEwLjQiRQ!5e0!3m2!1sen!2sus!4v1600000000000!5m2!1sen!2sus";

/** 取某篇联系信息文章的第一行纯文本（公司名 / 地址用）。 */
async function contactField(slug: string, title: string): Promise<string> {
  const category = await resolveCategory(slug);
  const result = await listPosts({ categoryId: category?.id, page: 1, perPage: 50 });
  const post = result.items.find((p) => p.title.toLowerCase() === title.toLowerCase());
  if (!post) return "";
  const lines = `${post.bodyHtml}`
    .replace(/<[^>]*>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .split("\n")
    .map((l) => l.trim())
    // 去掉「Company:」这类前缀，只留内容
    .map((l) => l.replace(/^(Company|Address|Tel|Fax|Mobile[^:：]*|E-?mail|Website|Skype|QQ)\s*[:：]\s*/i, ""))
    .filter((l) => l.length > 0);
  return lines[0] ?? "";
}

export default async function ContactPage() {
  /** 后台「联系我们 → General Information」栏目（sourceId 32）。 */
  const column = getArticleColumn(32);
  const slug = column?.slug ?? "general-information";

  const company = await contactField(slug, "Company");
  const address = await contactField(slug, "Address");

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="Contact" />

      <section className="border-b border-[#f0f0f0] bg-[#fafafa]">
        <div className="mx-auto w-full max-w-[1200px] px-3">
          <p className="text-[14px] leading-[55px] text-[#666]">
            <span className="mr-2 inline-block h-[14px] w-[3px] bg-[#e61d39] align-middle" />
            <Link className="font-bold text-[#e61d39]" href="/">
              Home
            </Link>
            <span className="mx-2 text-[#ccc]">/</span>
            <span className="text-[#666]">Contact</span>
          </p>
        </div>
      </section>

      <article className="mx-auto w-full max-w-[1200px] px-3 py-12">
        {/* Title */}
        <div className="text-center">
          <h1 className="text-[28px] font-bold uppercase tracking-[1px] text-[#c8102e]">Contact</h1>
          <i className="mx-auto mt-3 block h-[3px] w-[70px] bg-[#c8102e]" />
        </div>

        {/* Company name + address —— 读后台「Company」「Address」两篇 */}
        {company || address ? (
          <div className="mt-10">
            {company ? (
              <>
                <h2 className="text-[18px] font-bold uppercase text-[#c8102e]">{company}</h2>
                <i className="mt-3 block h-[2px] w-[50px] bg-[#c8102e]" />
              </>
            ) : null}
            {address ? (
              <p className="mt-5 text-[14px] font-medium leading-[24px] text-[#555]">{address}</p>
            ) : null}
          </div>
        ) : null}

        {/* Info grid + map */}
        <div className="mt-10 grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {column ? (
              <ContactInfoList column={column} />
            ) : (
              <p className="border border-dashed border-[#e0e0e0] bg-[#fafafa] px-6 py-12 text-center text-[13px] text-[#888]">
                Contact details are not configured yet.
              </p>
            )}
          </div>

          <div className="min-h-[400px] border border-[#eee] bg-[#f9f9f9] lg:col-span-1">
            <iframe
              allowFullScreen
              className="h-full min-h-[400px] w-full border-0"
              loading="lazy"
              src={MAP_SRC}
              title="Company location"
            />
          </div>
        </div>

        {/* QR codes */}
        <div className="mt-10">
          <p className="mb-4 text-[14px] font-bold text-[#333]">Qr code:</p>
          <div className="flex flex-wrap gap-8">
            {QR_IMAGES.map((src, i) => (
              <div className="shrink-0" key={src}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={`QR code ${i + 1}`}
                  className="h-[180px] w-[180px] border border-[#eee] object-cover"
                  src={src}
                />
              </div>
            ))}
          </div>
        </div>

        {/* World map */}
        <div
          className="relative mt-10 min-h-[450px] bg-contain bg-right bg-no-repeat lg:min-h-[550px]"
          style={{ backgroundImage: "url(/images/ct_map.png)" }}
        >
          <div className="pt-16 text-center lg:pt-32">
            <h2 className="text-[22px] font-bold uppercase leading-[32px] text-[#c8102e]">
              Our Products sell
              <br />
              to all over the world
            </h2>
            <i className="mx-auto mt-3 block h-[3px] w-[50px] bg-[#c8102e]" />
          </div>
        </div>

        {/* Message form */}
        <div className="mt-10 border-t border-[#eee] pt-10" id="contact_meg">
          <div className="text-center">
            <h2 className="text-[20px] font-bold uppercase text-[#c8102e]">
              I need leave a message to the seller
            </h2>
            <i className="mx-auto mt-3 block h-[3px] w-[50px] bg-[#c8102e]" />
            <p className="mt-3 text-[14px] text-[#888]">I need send an email to the seller</p>
          </div>
          <div className="mx-auto mt-8 max-w-[900px]">
            <InquiryForm lang="en" sourcePage="/contact" variant="source" />
          </div>
        </div>
      </article>

      <SiteFooter />
    </div>
  );
}
