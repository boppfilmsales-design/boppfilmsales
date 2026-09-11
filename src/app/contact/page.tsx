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
            <form action={submitInquiry} className="rounded-2xl border border-[#eee] bg-[#fafafa] p-6 shadow-sm">
              <h2 className="text-[16px] font-bold text-[#333]">Send Inquiry</h2>
              {status === "sent" && (
                <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] font-bold text-emerald-700" role="status">
                  Thank you. Your inquiry has been saved and our sales team will contact you shortly.
                </p>
              )}
              {status === "invalid" && (
                <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800" role="alert">
                  Please provide your name, a valid email and at least 10 characters describing your requirement.
                </p>
              )}
              <div className="mt-4 space-y-3 text-[13px]">
                <input autoComplete="organization" className="w-full rounded-lg border border-[#ddd] bg-white px-3 py-[11px]" maxLength={200} name="company" placeholder="Company name" />
                <input autoComplete="name" className="w-full rounded-lg border border-[#ddd] bg-white px-3 py-[11px]" maxLength={120} name="contact" placeholder="Your name *" required />
                <input autoComplete="email" className="w-full rounded-lg border border-[#ddd] bg-white px-3 py-[11px]" maxLength={254} name="email" placeholder="E-mail address *" required type="email" />
                <textarea className="h-[120px] w-full rounded-lg border border-[#ddd] bg-white px-3 py-[11px]" minLength={10} maxLength={5000} name="message" placeholder="Product, width, thickness, quantity... *" required />
                <button className="w-full rounded-full bg-[#c8102e] py-[13px] text-[13px] font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[#a30d25]" type="submit">
                  Submit inquiry
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
