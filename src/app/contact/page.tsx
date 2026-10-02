import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import InquiryForm from "@/components/InquiryForm";
import { ArticleColumnList } from "@/components/pages/ArticleColumn";
import { getArticleColumn } from "@/lib/article-columns";

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
 * 2026-10-02 重构说明
 * =====================================================================
 * 改造前：这一页的联系方式（公司名、地址、Tel、Fax、Mobile、Url、Email、
 *         Skype、QQ、WeChat、WhatsApp、Our Official Address）**全部硬编码**
 *         在本文件里，而后台「内容管理 → 联系我们 → General Information」
 *         另有 8 条数据 —— 两边互不相干。于是运营在后台改了联系方式，
 *         前台没有任何变化，后台列表还只显示「10 - TEXT」这种占位符。
 *
 * 改造后：这一页的联系方式由后台文章驱动（news_posts，栏目 sourceId = 32），
 *         渲染方式与 新闻中心 → Employees Literary 完全一致 —— 左侧列表，
 *         点进去看详情页 /news/general-information/<id>。
 *
 * 保留：面包屑、页面标题、地图、二维码、世界地图宣传语、留言表单。
 *       地图/二维码/表单属于功能性内容，不适合做成文章。
 */
const QR_IMAGES = [
  "/images/qr/qr1.jpg",
  "/images/qr/qr2.jpg",
  "/images/qr/qr3.jpg",
  "/images/qr/qr4.jpg",
];

const MAP_SRC =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3654.0!2d117.302891!3d31.806389!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzHCsDQ4JzIzLjAiTiAxMTfCsDE4JzEwLjQiRQ!5e0!3m2!1sen!2sus!4v1600000000000!5m2!1sen!2sus";

export default async function ContactPage() {
  /** 后台「联系我们 → General Information」栏目（sourceId 32）。 */
  const column = getArticleColumn(32);

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
        {/* Main title */}
        <div className="text-center">
          <h1 className="text-[28px] font-bold uppercase tracking-[1px] text-[#c8102e]">Contact</h1>
          <i className="mx-auto mt-3 block h-[3px] w-[70px] bg-[#c8102e]" />
        </div>

        {/*
          联系方式 —— 由后台文章驱动。
          与 /honor、/downloads、/cases 等栏目用的是同一个列表组件，
          所以样式与「新闻中心 → Employees Literary」完全一致。
        */}
        <div className="mt-10">
          {column ? (
            <ArticleColumnList column={column} lang="en" />
          ) : (
            <p className="border border-dashed border-[#e0e0e0] bg-[#fafafa] px-6 py-12 text-center text-[13px] text-[#888]">
              Contact details are not configured yet. Add them from Admin → Content → Contact Us →
              General Information.
            </p>
          )}
        </div>

        {/* Map */}
        <div className="mt-10 min-h-[400px] border border-[#eee] bg-[#f9f9f9]">
          <iframe
            allowFullScreen
            className="h-full min-h-[400px] w-full border-0"
            loading="lazy"
            src={MAP_SRC}
            title="Company location"
          />
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
