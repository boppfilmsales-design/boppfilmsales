import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { submitInquiry } from "@/app/contact/actions";

export const metadata: Metadata = {
  title: "Contact - Asia Pacific Industry Group Co., Limited",
};

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  return (
    <div className="min-h-screen bg-white relative">
      <SiteHeader active="Contact" />
      
      {/* 面包屑导航 */}
      <section className="border-b border-[#f0f0f0] bg-[#fafafa]">
        <div className="mx-auto w-full max-w-[1200px] px-3">
          <p className="text-[14px] leading-[55px] text-[#666]">
            <span className="mr-2 inline-block h-[14px] w-[3px] bg-[#e61d39] align-middle" />
            <span className="font-bold text-[#e61d39]">Home</span> / Contact
          </p>
        </div>
      </section>

      {/* 主体内容区 */}
      <section className="py-12">
        <div className="mx-auto w-full max-w-[1200px] px-3">
          <h1 className="text-center text-[30px] font-bold uppercase text-[#e61d39]">Contact Us</h1>
          <i className="mx-auto mt-[15px] block h-[5px] w-[92px] bg-[#e61d39]" />
          
          <div className="mt-10 grid gap-10 lg:grid-cols-12 items-start">
            
            {/* 左侧：带彩色圆标图标的多行联系方式 (占约 5 列) */}
            <div className="lg:col-span-5 space-y-6 text-[14px] leading-[26px] text-[#555] lg:border-r lg:border-[#e5e5e5] lg:pr-8">
              
              {/* 公司地址与名称 */}
              <div>
                <p className="font-bold text-[#333] text-[16px] mb-2">Asia Pacific Industry Group Co., Limited</p>
                <div className="flex items-start gap-3 mt-2">
                  <span className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-[#c8102e] text-[12px] text-white shadow">📍</span>
                  <span className="font-medium text-[#444]">NO.3399 LUZHOU AVE., BAOHE DIST., 230051, HEFEI, ANHUI, CHINA</span>
                </div>
              </div>

              {/* 电话 */}
              <div className="flex items-center gap-3">
                <span className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-[#c8102e] text-[12px] text-white shadow">☎</span>
                <span>Tel: 86-551-64687285</span>
              </div>

              {/* Skype 多行 */}
              <div className="flex items-start gap-3">
                <span className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-[#00aff0] text-[12px] font-bold text-white shadow">S</span>
                <div className="flex flex-col">
                  <span className="font-semibold text-[#333]">Skype:</span>
                  <span>asiapacificsale</span>
                  <span>boppfilmsales</span>
                  <span>boppfilmsale</span>
                </div>
              </div>

              {/* QQ 多行 */}
              <div className="flex items-start gap-3">
                <span className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-[#12b7f5] text-[11px] font-bold text-white shadow">QQ</span>
                <div className="flex flex-col">
                  <span className="font-semibold text-[#333]">QQ:</span>
                  <span>840715367</span>
                  <span>2538474128</span>
                  <span>156641365</span>
                  <span>2500526557</span>
                </div>
              </div>

              {/* 微信 / Mobile / WhatsApp */}
              <div className="flex items-start gap-3">
                <span className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-[#07c160] text-[10px] font-bold text-white shadow">微信</span>
                <div className="flex flex-col">
                  <span className="font-semibold text-[#333]">Mobile / WhatsApp / WeChat:</span>
                  <span>86-18919654871</span>
                  <span>86-18919659471</span>
                  <span>86-18955113807</span>
                </div>
              </div>

              {/* 邮箱 */}
              <div className="flex items-start gap-3 pt-2 border-t border-[#eee]">
                <span className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-[#c8102e] text-[11px] text-white shadow">✉</span>
                <div className="flex flex-col">
                  <span className="font-semibold text-[#333]">E-mail:</span>
                  <a className="text-[#e61d39] hover:underline" href="mailto:sales@boppfilmsales.com">
                    sales@boppfilmsales.com
                  </a>
                  <a className="text-[#e61d39] hover:underline" href="mailto:admin@apigcl.com">
                    admin@apigcl.com
                  </a>
                </div>
              </div>

            </div>

            {/* 右侧：还原源站布局的表单区 (占约 7 列) */}
            <div className="lg:col-span-7 bg-white p-2">
              <form action={submitInquiry} className="space-y-4">
                {status === "sent" && (
                  <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] font-bold text-emerald-700" role="status">
                    Thank you. Your inquiry has been saved and our sales team will contact you shortly.
                  </p>
                )}
                {status === "invalid" && (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800" role="alert">
                    Please provide a valid email and your message.
                  </p>
                )}

                {/* Email * 独占一行 */}
                <div>
                  <label className="block text-[13px] text-[#666] mb-1">
                    Email <span className="text-[#c8102e]">*</span>
                  </label>
                  <input 
                    autoComplete="email" 
                    className="w-full rounded border border-[#dfdfdf] bg-white px-3 py-[10px] text-[14px] focus:border-[#c8102e] focus:outline-none" 
                    maxLength={254} 
                    name="email" 
                    required 
                    type="email" 
                  />
                </div>

                {/* 第二行：Company or Name (左) 和 Tel or Mobile (右) 左右排布 */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-[13px] text-[#666] mb-1">Company or Name</label>
                    <input 
                      autoComplete="name" 
                      className="w-full rounded border border-[#dfdfdf] bg-white px-3 py-[10px] text-[14px] focus:border-[#c8102e] focus:outline-none" 
                      maxLength={120} 
                      name="contact" 
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] text-[#666] mb-1">Tel or Mobile</label>
                    <input 
                      autoComplete="tel" 
                      className="w-full rounded border border-[#dfdfdf] bg-white px-3 py-[10px] text-[14px] focus:border-[#c8102e] focus:outline-none" 
                      maxLength={50} 
                      name="phone" 
                    />
                  </div>
                </div>

                {/* 第三行：Leave a message */}
                <div>
                  <label className="block text-[13px] text-[#666] mb-1">
                    Leave a message <span className="text-[#888] font-normal">(Please send us your idea or plan)</span>
                  </label>
                  <textarea 
                    className="h-[140px] w-full rounded border border-[#dfdfdf] bg-white px-3 py-[10px] text-[14px] focus:border-[#c8102e] focus:outline-none" 
                    maxLength={5000} 
                    name="message" 
                    required 
                  />
                </div>

                {/* 仿源站红框白底 Send Message 按钮 */}
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

      {/* 右侧悬浮快捷导航 */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50 hidden md:flex flex-col shadow-lg">
        <a href="tel:8655164687285" className="bg-[#c8102e] hover:bg-[#a30d25] text-white p-3 flex items-center justify-center border-b border-red-700 transition" title="Phone">
          📞
        </a>
        <a href="#skype" className="bg-[#00aff0] hover:bg-[#0090d8] text-white p-3 flex items-center justify-center border-b border-sky-600 transition" title="Skype">
          S
        </a>
        <a href="https://wa.me/8618919654871" target="_blank" rel="noreferrer" className="bg-[#25d366] hover:bg-[#1ebe5d] text-white p-3 flex items-center justify-center border-b border-emerald-600 transition" title="WhatsApp">
          💬
        </a>
        <a href="mailto:sales@boppfilmsales.com" className="bg-[#c8102e] hover:bg-[#a30d25] text-white p-3 flex items-center justify-center border-b border-red-700 transition" title="Email">
          ✉
        </a>
      </div>

      <SiteFooter />
    </div>
  );
}