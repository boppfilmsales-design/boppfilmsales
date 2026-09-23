"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { categoryNameZh, SITE } from "@/lib/site-helpers";
import { AllPdfsSection } from "@/components/pages/Sections";

const COPY = {
  en: {
    heroEyebrow: "Hefei · China · Global film supply",
    cta1: "Explore products →",
    cta2: "TDS / MSDS library",
    badgeKicker: "Global delivery",
    badgeTitle: "Industrial film rolls prepared for export",
    badgeSub: "Technical selection · Slitting · Export packing",
    expertise: "BOPET expertise",
    aboutEyebrow: "About us",
    aboutTitle: "Asia Pacific's wrapping film packs the world.",
    aboutBody: [
      "Asia Pacific Industry Group Co., Limited is a leading manufacturer and global supplier of high-end industrial films, packaging solutions, and advanced extrusion lines.",
      "With decades of expertise in BOPET, BOPP, POF, CPP, and specialized films, we serve converters and industrial partners worldwide with unmatched precision and quality.",
    ] as string[],
    aboutCta1: "Company profile →",
    aboutCta2: "Honours & certificates",
    familiesTitle: "Main Product Families",
    featuredEyebrow: "Product & classification",
    featuredTitle: "Featured products",
    featuredCta: (n: number) => `All ${n} products →`,
    newsTitle: "News Center",
    newsCta: "More news",
    newsLoading: "News is loading…",
    contactCompany: "Company",
    contactSales: "Sales",
    contactOnline: "On-line",
  },
  zh: {
    heroEyebrow: "合肥 · 中国 · 全球薄膜供应",
    cta1: "浏览产品 →",
    cta2: "技术资料 / MSDS 库",
    badgeKicker: "全球发货",
    badgeTitle: "工业薄膜卷，整装待发",
    badgeSub: "技术选型 · 分切 · 出口包装",
    expertise: "BOPET 专精",
    aboutEyebrow: "关于我们",
    aboutTitle: "亚太薄膜，包装世界",
    aboutBody: [
      "亚太工业集团有限公司是全球领先的高端工业薄膜、包装解决方案及先进挤出生产线制造商与供应商。",
      "在 BOPET、BOPP、POF、CPP 及特种薄膜领域拥有深厚的技术底蕴，我们以卓越的品质和精密制造服务全球转换商与合作伙伴。",
    ] as string[],
    aboutCta1: "公司简介 →",
    aboutCta2: "荣誉与资质",
    familiesTitle: "主营产品系列",
    featuredEyebrow: "产品与分类",
    featuredTitle: "精选产品",
    featuredCta: (n: number) => `全部 ${n} 个产品 →`,
    newsTitle: "新闻中心",
    newsCta: "更多新闻",
    newsLoading: "新闻加载中…",
    contactCompany: "公司",
    contactSales: "销售",
    contactOnline: "在线",
  },
} as const;

// 11 张工厂实景图与对应的中英文经典标语配置
const HERO_SLIDES = [
  {
    image: "/uploads/content/20180921123852_32535.jpg",
    zh: "精诚所至 金石为开 亚太薄膜 包装世界。",
    en: "Sincerity moves metals and stones; Asia Pacific films pack the world.",
  },
  {
    image: "/uploads/content/20180921123911_98135.jpg",
    zh: "中国高端薄膜制造者，勇攀薄膜制造最高峰",
    en: "China's premier high-end film manufacturer, scaling the pinnacle of film extrusion technology.",
  },
  {
    image: "/uploads/content/20180921123930_43821.jpg",
    zh: "亚太薄膜，技艺精湛，直面珠穆朗玛峰。",
    en: "Asia Pacific films crafted with superb mastery, standing tall against the highest peak.",
  },
  {
    image: "/uploads/content/20180921123948_29404.jpg",
    zh: "薄膜吾家事，谁与争锋？",
    en: "Industrial packaging films are our legacy—who dares to challenge our leadership?",
  },
  {
    image: "/uploads/content/20180921124008_79463.jpg",
    zh: "精诚所至 金石为开 亚太薄膜 包装世界。",
    en: "Sincerity moves metals and stones; Asia Pacific films pack the world.",
  },
  {
    image: "/uploads/content/20180921124025_89694.jpg",
    zh: "中国高端薄膜制造者，勇攀薄膜制造最高峰",
    en: "China's premier high-end film manufacturer, scaling the pinnacle of film extrusion technology.",
  },
  {
    image: "/uploads/content/20180921124042_70262.jpg",
    zh: "亚太薄膜，技艺精湛，直面珠穆朗玛峰。",
    en: "Asia Pacific films crafted with superb mastery, standing tall against the highest peak.",
  },
  {
    image: "/uploads/content/20180921124100_12296.jpg",
    zh: "薄膜吾家事，谁与争锋？",
    en: "Industrial packaging films are our legacy—who dares to challenge our leadership?",
  },
  {
    image: "/uploads/content/20180921124117_17434.jpg",
    zh: "精诚所至 金石为开 亚太薄膜 包装世界。",
    en: "Sincerity moves metals and stones; Asia Pacific films pack the world.",
  },
  {
    image: "/uploads/content/20180921124133_35944.jpg",
    zh: "中国高端薄膜制造者，勇攀薄膜制造最高峰",
    en: "China's premier high-end film manufacturer, scaling the pinnacle of film extrusion technology.",
  },
  {
    image: "/uploads/content/20180921124149_80738.jpg",
    zh: "亚太薄膜，技艺精湛，直面珠穆朗玛峰。",
    en: "Asia Pacific films crafted with superb mastery, standing tall against the highest peak.",
  },
];

export default function HomeContent({ 
  lang = "en", 
  initialData 
}: { 
  lang?: "en" | "zh"; 
  initialData?: any; 
}) {
  const t = COPY[lang];
  
  const categories = initialData?.categories || [];
  const pdfs = initialData?.pdfs || [];
  const news = initialData?.news || [];
  const featured = initialData?.featured || [];
  const gallery = initialData?.gallery || [];
  const totalProducts = initialData?.totalProducts || 0;

  const aboutZh = lang === "zh" ? initialData?.aboutZhHtml || "" : "";

  // 轮播图状态控制
  const [currentSlide, setCurrentSlide] = useState(0);

  // 自动循环轮播（每隔 4 秒切换下一张图，当页面不可见时暂停以节省 Worker 资源）
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
      }
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      {/* 顶部 Hero 区 */}
      <section className="relative isolate overflow-hidden bg-[#101722] text-white">
        <div className="pointer-events-none absolute -left-40 top-0 h-[520px] w-[520px] rounded-full bg-[#c8102e]/20 blur-[130px]" />
        
        <div className="relative mx-auto grid min-h-[680px] w-full max-w-[1560px] items-center gap-14 px-4 py-20 lg:grid-cols-[1.08fr_.92fr] lg:py-24">
          
          {/* 左侧文字与按钮区 */}
          <div>
            <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.24em] text-white/70 backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-[#e31b3d] shadow-[0_0_16px_#e31b3d]" />
              {t.heroEyebrow}
            </div>

            <div className="mt-7">
              <h1 className="text-[28px] font-black leading-[1.25] tracking-[-0.02em] sm:text-[38px] xl:text-[46px]">
                Advanced films.<br />Built for industry.
              </h1>
              <p className="mt-4 text-[15px] leading-[28px] text-white/70 max-w-[640px]">
                {lang === "zh"
                  ? "亚太工业集团有限公司向全球转换商与制造商稳定供应精密 BOPET、BOPP、POF、BOPS 和 CPP 薄膜、母卷、热覆膜材料及整套生产线。"
                  : "Asia Pacific Industry Group Co., Limited supplies precision BOPET, BOPP, POF, BOPS and CPP films, tape jumbo rolls, thermal lamination materials and complete production lines to converters and manufacturers worldwide."}
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className="rounded-full bg-[#c8102e] px-7 py-4 text-[12px] font-black uppercase tracking-[0.16em] text-white shadow-[0_16px_40px_rgba(200,16,46,.3)] transition hover:-translate-y-0.5 hover:bg-[#e31b3d]"
                href={lang === "zh" ? "/zh/products" : "/products"}
              >
                {t.cta1}
              </Link>
              <Link
                className="rounded-full border border-white/25 bg-white/[0.04] px-7 py-4 text-[12px] font-black uppercase tracking-[0.16em] text-white backdrop-blur transition hover:border-white hover:bg-white hover:text-slate-950"
                href={lang === "zh" ? "/zh/downloads" : "/downloads"}
              >
                {t.cta2}
              </Link>
            </div>

            <dl className="mt-12 grid max-w-[760px] grid-cols-2 gap-x-6 gap-y-7 border-t border-white/10 pt-8 sm:grid-cols-4">
              {[
                { k: t.familiesTitle, v: categories.length },
                { k: lang === "zh" ? "细分产品" : "Detailed products", v: totalProducts },
                { k: lang === "zh" ? "文档链接" : "Document links", v: pdfs.length },
                { k: lang === "zh" ? "出口市场" : "Export markets", v: "30+" },
              ].map((stat) => (
                <div key={stat.k}>
                  <dd className="text-[29px] font-black tracking-[-0.04em] text-white">{stat.v}</dd>
                  <dt className="mt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-white/45">{stat.k}</dt>
                </div>
              ))}
            </dl>
          </div>

          {/* 右侧：11张实景轮播图区域 */}
          <div className="relative hidden lg:block">
            <div className="absolute -inset-5 rounded-[36px] border border-white/10" />
            <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-slate-900 shadow-2xl backdrop-blur h-[520px]">
              
              {/* 11张工厂实景图片轮播层 */}
              {HERO_SLIDES.map((slide, index) => (
                <div
                  key={slide.image}
                  className={`absolute inset-0 h-full w-full transition-opacity duration-1000 ease-in-out ${
                    index === currentSlide ? "opacity-100 z-0" : "opacity-0 -z-10 pointer-events-none"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={slide.image}
                    alt="Asia Pacific Industry Group Factory Slide"
                    className="absolute inset-0 h-full w-full object-contain object-center p-2"
                  />
                  {/* 底部渐变遮罩，确保悬浮标语清晰可读 */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                </div>
              ))}

              {/* 悬浮在图片上方的白色字体标语卡片 */}
              <div className="absolute inset-x-7 bottom-7 z-25 rounded-2xl border border-white/15 bg-black/60 p-5 backdrop-blur-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ff6b82]">
                    {lang === "zh" ? `工厂实景 ${currentSlide + 1} / ${HERO_SLIDES.length}` : `FACTORY VIEW ${currentSlide + 1} / ${HERO_SLIDES.length}`}
                  </span>
                  {/* 轮播指示小圆点 */}
                  <div className="flex space-x-1.5">
                    {HERO_SLIDES.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentSlide(idx)}
                        className={`h-1.5 rounded-full transition-all ${
                          idx === currentSlide ? "w-4 bg-[#c8102e]" : "w-1.5 bg-white/40 hover:bg-white"
                        }`}
                        aria-label={`Slide ${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-[15px] font-bold text-white leading-snug drop-shadow">
                  {lang === "zh" ? HERO_SLIDES[currentSlide].zh : HERO_SLIDES[currentSlide].en}
                </p>
              </div>

            </div>

            {/* 左上角 4.5μm 漂浮小卡片 */}
            <div className="absolute -left-12 top-16 rounded-2xl border border-white/15 bg-white/95 p-4 text-slate-950 shadow-2xl z-30">
              <span className="block text-2xl font-black text-[#c8102e]">4.5μm</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{t.expertise}</span>
            </div>
          </div>

        </div>
      </section>

      {/* About Us Intro */}
      <section className="border-y border-[#ececec] bg-[#f7f8fa] py-20">
        <div className="mx-auto grid w-full max-w-[1560px] items-center gap-14 px-4 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#c8102e]">{t.aboutEyebrow}</p>
            <h2 className="mt-4 text-[30px] font-black leading-[1.12] tracking-[-0.02em] text-[#101722] sm:text-[40px]">
              {t.aboutTitle}
            </h2>
            {lang === "zh" && aboutZh ? (
              <div
                className="news-body mt-6 text-[15px] leading-[30px] text-[#5b6472]"
                dangerouslySetInnerHTML={{ __html: aboutZh }}
              />
            ) : (
              t.aboutBody.map((para, i) => (
                <p className="mt-6 text-[15px] leading-[30px] text-[#5b6472]" key={i}>
                  {para}
                </p>
              ))
            )}
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                className="rounded-full bg-[#c8102e] px-6 py-3 text-[12px] font-black uppercase tracking-[0.16em] text-white shadow-[0_14px_34px_rgba(200,16,46,.28)] transition hover:-translate-y-0.5 hover:bg-[#e31b3d]"
                href={lang === "zh" ? "/zh/about" : "/about"}
              >
                {t.aboutCta1}
              </Link>
              <Link
                className="rounded-full border border-[#d6dae0] bg-white px-6 py-3 text-[12px] font-black uppercase tracking-[0.16em] text-[#101722] transition hover:border-[#c8102e] hover:text-[#c8102e]"
                href={lang === "zh" ? "/zh/honor" : "/honor"}
              >
                {t.aboutCta2}
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {gallery.slice(0, 4).map((g: any) => (
              <figure
                className="group relative overflow-hidden rounded-2xl border border-[#e8e8e8] bg-white shadow-sm aspect-square"
                key={g.src}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={g.title}
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  src={g.src}
                />
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Product Families */}
      <section className="py-16">
        <div className="mx-auto w-full max-w-[1560px] px-4">
          <div className="text-center">
            <h2 className="text-[28px] font-black text-[#22262e]">{t.familiesTitle}</h2>
            <i className="mx-auto mt-3 block h-[5px] w-[90px] bg-[#c8102e]" />
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((category: any) => {
              const zhName = categoryNameZh(category.sourceId);
              return (
                <Link
                  className="group border border-[#e8e8e8] bg-white p-6 transition-all hover:-translate-y-[3px] hover:border-[#c8102e] hover:shadow-xl"
                  href={lang === "zh" ? `/zh/products/${category.sourceId}` : `/products/${category.sourceId}`}
                  key={category.sourceId}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-[15px] font-bold leading-snug text-[#22262e] group-hover:text-[#c8102e]">
                      {lang === "zh" && zhName ? zhName : category.name}
                    </h3>
                    <span className="shrink-0 bg-[#f4f4f4] px-2 py-[2px] text-[11px] font-bold text-[#888]">
                      {category.count}
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-3 text-[13px] leading-[22px] text-[#777]">
                    {lang === "zh"
                      ? (category.sampleNamesZh || []).join(" · ")
                      : (category.sampleNames || []).join(" · ")}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="bg-[#101722] py-20 text-white">
        <div className="mx-auto w-full max-w-[1560px] px-4">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#ff6b82]">{t.featuredEyebrow}</p>
              <h2 className="mt-3 text-[28px] font-black tracking-[-0.02em] sm:text-[34px]">{t.featuredTitle}</h2>
            </div>
            <Link
              className="rounded-full border border-white/25 px-6 py-3 text-[12px] font-black uppercase tracking-[0.16em] text-white transition hover:bg-white hover:text-slate-950"
              href={lang === "zh" ? "/zh/products" : "/products"}
            >
              {t.featuredCta(totalProducts)}
            </Link>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {featured.map(({ category, product }: any) => {
              const zhCat = categoryNameZh(category.sourceId);
              return (
                <Link
                  className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] transition hover:-translate-y-1 hover:border-white/30 flex flex-col"
                  href={lang === "zh" ? `/zh/products/${category.sourceId}/${product.sourceId}` : `/products/${category.sourceId}/${product.sourceId}`}
                  key={`${category.sourceId}-${product.sourceId}`}
                >
                  <div className="relative aspect-square w-full overflow-hidden bg-slate-950/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={product.title}
                      className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110"
                      src={product.gallery0}
                    />
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                        {lang === "zh" && zhCat ? zhCat : category.name}
                      </p>
                      <p className="mt-2 line-clamp-2 text-[13px] font-bold leading-snug text-white group-hover:text-[#ff8fa1]">
                        {lang === "zh" && product.titleZh ? product.titleZh : product.title}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <AllPdfsSection lang={lang} pdfs={pdfs} />

      {/* News Section */}
      <section className="py-16">
        <div className="mx-auto w-full max-w-[1560px] px-4">
          <div className="text-center">
            <h2 className="text-[28px] font-black text-[#22262e]">{t.newsTitle}</h2>
            <i className="mx-auto mt-3 block h-[5px] w-[90px] bg-[#c8102e]" />
          </div>
          <ul className="mx-auto mt-9 max-w-[980px] divide-y divide-[#eee] border border-[#eee]">
            {news.map((post: any) => (
              <li className="flex flex-wrap items-start justify-between gap-3 p-5" key={post.id}>
                <Link
                  className="max-w-[700px] text-[14px] font-bold text-[#333] hover:text-[#c8102e]"
                  href={lang === "zh" ? `/zh/news/${post.slug}/${post.id}` : `/news/${post.slug}/${post.id}`}
                >
                  {post.title}
                </Link>
                <span className="text-[12px] text-[#999]">
                  {post.category} · {post.listDate}
                </span>
              </li>
            ))}
            {news.length === 0 && (
              <li className="p-6 text-center text-[13px] text-[#888]">{t.newsLoading}</li>
            )}
          </ul>
          <div className="mt-8 text-center">
            <Link
              className="inline-block bg-[#c8102e] px-7 py-[12px] text-[13px] font-bold uppercase tracking-[1px] text-white"
              href={lang === "zh" ? "/zh/news" : "/news"}
            >
              {t.newsCta}
            </Link>
          </div>
        </div>
      </section>

      {/* Contact Blocks */}
      <section className="bg-white py-16 border-t border-[#eee]">
        <div className="mx-auto w-full max-w-[1560px] px-4">
          <div className="text-center">
            <h2 className="text-[28px] font-bold uppercase tracking-wider text-[#22262e]">CONTACT</h2>
            <i className="mx-auto mt-3 block h-[4px] w-[70px] bg-[#c8102e]" />
          </div>

          <div className="mt-12 grid gap-12 lg:grid-cols-12 items-start">
            <div className="lg:col-span-5 space-y-5 text-[14px] text-[#555]">
              <div className="flex items-start gap-3">
                <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-[#00aff0] text-[12px] font-bold text-white shadow">S</span>
                <div className="flex flex-col leading-[24px]">
                  <span>asiapacificsale</span>
                  <span>boppfilmsales</span>
                  <span>boppfilmsale</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-[#12b7f5] text-[11px] font-bold text-white shadow">QQ</span>
                <div className="flex flex-col leading-[24px]">
                  <span>840715367</span>
                  <span>2538474128</span>
                  <span>156641365</span>
                  <span>2500526557</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-[#07c160] text-[10px] font-bold text-white shadow">微信</span>
                <div className="flex flex-col leading-[24px]">
                  <span>18919654871</span>
                  <span>18919659471</span>
                  <span>18955113807</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-[#25d366] text-[12px] font-bold text-white shadow">📞</span>
                <div className="flex flex-col leading-[24px]">
                  <span>86-86-18919654871</span>
                  <span>86-86-18919659471</span>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-2">
                <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-[#c8102e] text-[11px] text-white shadow">✉</span>
                <div className="flex flex-col leading-[24px]">
                  <a className="text-[#c8102e] hover:underline" href="mailto:sales@boppfilmsales.com">sales@boppfilmsales.com</a>
                  <a className="text-[#c8102e] hover:underline" href="mailto:admin@apigcl.com">admin@apigcl.com</a>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 bg-white">
              <form action="/contact" method="POST" className="space-y-4">
                <div>
                  <label className="block text-[13px] text-[#666] mb-1">
                    Email <span className="text-[#c8102e]">*</span>
                  </label>
                  <input 
                    className="w-full rounded border border-[#dfdfdf] bg-white px-3 py-[10px] text-[14px] focus:border-[#c8102e] focus:outline-none" 
                    name="email" 
                    required 
                    type="email" 
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-[13px] text-[#666] mb-1">Company or Name</label>
                    <input 
                      className="w-full rounded border border-[#dfdfdf] bg-white px-3 py-[10px] text-[14px] focus:border-[#c8102e] focus:outline-none" 
                      name="contact" 
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] text-[#666] mb-1">Tel or Mobile</label>
                    <input 
                      className="w-full rounded border border-[#dfdfdf] bg-white px-3 py-[10px] text-[14px] focus:border-[#c8102e] focus:outline-none" 
                      name="phone" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] text-[#666] mb-1">
                    Leave a message <span className="text-[#888] font-normal">(Please send us your idea or plan)</span>
                  </label>
                  <textarea 
                    className="h-[140px] w-full rounded border border-[#dfdfdf] bg-white px-3 py-[10px] text-[14px] focus:border-[#c8102e] focus:outline-none" 
                    name="message" 
                    required 
                  />
                </div>

                <div>
                  <button 
                    className="rounded border border-[#c8102e] bg-white px-7 py-2.5 text-[14px] font-medium text-[#c8102e] transition hover:bg-[#c8102e] hover:text-white" 
                    type="submit"
                  >
                    Send Message
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}