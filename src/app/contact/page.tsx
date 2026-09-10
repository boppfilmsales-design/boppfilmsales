import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Contact - Asia Pacific Industry Group Co., Limited",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="Contact" />
      <section className="border-b border-[#f0f0f0] bg-[#fafafa]">
        <div className="mx-auto w-full max-w-[1200px] px-3">
          <p className="text-[14px] leading-[55px] text-[#666]">
            <span className="mr-2 inline-block h-[14px] w-[3px] bg-[#e61d39] align-middle" />
            <span className="font-bold text-[#e61d39]">Home</span> / Contact
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto w-full max-w-[1200px] px-3">
          <h1 className="text-center text-[30px] font-bold uppercase text-[#e61d39]">Contact Us</h1>
          <i className="mx-auto mt-[15px] block h-[5px] w-[92px] bg-[#e61d39]" />
          <div className="mt-10 grid gap-8 md:grid-cols-2">
            <div className="space-y-4 text-[14px] leading-[26px] text-[#555]">
              <p className="font-bold text-[#333]">Asia Pacific Industry Group Co., Limited</p>
              <p>NO.3399 LUZHOU AVE., BAOHE DIST., 230051, HEFEI, ANHUI, CHINA</p>
              <p>Tel: 86-551-64687285</p>
              <p>Mobile / WhatsApp: 86-18919654871, 86-18919659471</p>
              <p>
                E-mail:{" "}
                <a className="text-[#e61d39] hover:underline" href="mailto:sales@boppfilmsales.com">
                  sales@boppfilmsales.com
                </a>
                ,{" "}
                <a className="text-[#e61d39] hover:underline" href="mailto:admin@apigcl.com">
                  admin@apigcl.com
                </a>
              </p>
              <p>Skype: asiapacificsale / boppfilmsales / boppfilmsale</p>
              <p>QQ: 840715367 / 2538474128 / 156641365 / 2500526557</p>
            </div>
            <form action="/contact" className="border border-[#eee] bg-[#fafafa] p-6" method="post">
              <h2 className="text-[16px] font-bold text-[#333]">Send Inquiry</h2>
              <div className="mt-4 space-y-3 text-[13px]">
                <input className="w-full border border-[#ddd] bg-white px-3 py-[10px]" name="company" placeholder="Company name" />
                <input className="w-full border border-[#ddd] bg-white px-3 py-[10px]" name="contact" placeholder="Your name" />
                <input className="w-full border border-[#ddd] bg-white px-3 py-[10px]" name="email" placeholder="E-mail address" type="email" />
                <textarea className="h-[110px] w-full border border-[#ddd] bg-white px-3 py-[10px]" name="message" placeholder="Product, width, thickness, quantity..." />
                <button className="w-full bg-[#e61d39] py-[11px] text-[13px] font-bold uppercase text-white" type="submit">
                  Submit
                </button>
                <p className="text-[12px] text-[#999]">
                  Or simply write to sales@boppfilmsales.com — we reply within 12 working hours.
                </p>
              </div>
            </form>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
