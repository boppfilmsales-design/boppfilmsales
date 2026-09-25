import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import InquiryForm from "@/components/InquiryForm";

export const metadata: Metadata = {
  title: "Contact - Asia Pacific Industry Group Co., Limited",
  description:
    "Contact Asia Pacific Industry Group Co., Limited — BOPP / BOPET film, tape and thermal laminating film manufacturer in Hefei, China.",
};

const CONTACT = {
  company: "ASIA PACIFIC INDUSTRY GROUP CO., LIMITED",
  address: "NO.3399 LUZHOU AVE., BAOHE DIST., 230051, HEFEI, ANHUI, CHINA",
  tel: "86-551-64687285",
  fax: "86-551-64683490",
  mobiles: ["86-86-18919654871", "86-86-18919659471"],
  urls: [
    { label: "http://www.boppfilmsales.com", href: "http://www.boppfilmsales.com" },
    { label: "http://www.boppfilmsale.com", href: "http://www.boppfilmsale.com" },
  ],
  emails: ["sales@boppfilmsales.com", "info@boppfilmsales.com"],
  skype: ["asiapacificsale", "boppfilmsales", "boppfilmsale"],
  qq: ["840715367", "2538474128", "156641365", "2500526557"],
  whatsapp: ["86-86-18919654871", "86-86-18919659471"],
  wechat: ["18919654871", "18919659471", "18955113807"],
  publicEmails: ["sales@boppfilmsales.com", "admin@apigcl.com"],
};

const QR_IMAGES = [
  "/images/qr/qr1.jpg",
  "/images/qr/qr2.jpg",
  "/images/qr/qr3.jpg",
  "/images/qr/qr4.jpg",
];

/** Source-style info row (Tel / Fax / Mobile / Url / Email). */
function InfoRow({
  icon,
  label,
  children,
}: {
  icon: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-[#eee] py-4 text-[14px]">
      <div className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full bg-[#f4f4f4] text-[#c8102e]">
        <span className="text-[18px] leading-none">{icon}</span>
      </div>
      <div className="flex-1 pt-[6px]">
        <p className="font-bold text-[#333]">{label}</p>
        <div className="mt-1 leading-[24px] text-[#555]">{children}</div>
      </div>
    </div>
  );
}

/** Bottom contact icon list item. */
function ContactIconItem({
  icon,
  label,
  children,
}: {
  icon: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3 border-r border-[#eee] px-4 py-4 last:border-r-0">
      <div className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full bg-[#f4f4f4] text-[#c8102e]">
        <span className="text-[20px] leading-none">{icon}</span>
      </div>
      <div className="min-w-[140px]">
        <p className="text-[13px] font-bold text-[#333]">{label}</p>
        <div className="mt-1 text-[13px] leading-[22px] text-[#555]">{children}</div>
      </div>
    </li>
  );
}

export default function ContactPage() {
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

        {/* Company name + address */}
        <div className="mt-10 text-center">
          <h2 className="text-[18px] font-bold text-[#c8102e]">{CONTACT.company}</h2>
          <i className="mx-auto mt-3 block h-[3px] w-[50px] bg-[#c8102e]" />
          <p className="mx-auto mt-4 max-w-[700px] text-[14px] font-medium leading-[24px] text-[#555]">
            {CONTACT.address}
          </p>
        </div>

        {/* Info + Map */}
        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <div className="space-y-0">
            <InfoRow icon="☎" label="Tel:">
              <span>{CONTACT.tel}</span>
            </InfoRow>
            <InfoRow icon="📠" label="Fax:">
              <span>{CONTACT.fax}</span>
            </InfoRow>
            <InfoRow icon="📱" label="Mobile phone:">
              {CONTACT.mobiles.map((m) => (
                <span className="block" key={m}>
                  {m}
                </span>
              ))}
            </InfoRow>
            <InfoRow icon="🔗" label="Url:">
              {CONTACT.urls.map((u) => (
                <a
                  className="block text-[#1c6dd0] hover:underline"
                  href={u.href}
                  key={u.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {u.label}
                </a>
              ))}
            </InfoRow>
            <InfoRow icon="✉" label="Emaile adress:">
              {CONTACT.emails.map((e) => (
                <a className="block text-[#1c6dd0] hover:underline" href={`mailto:${e}`} key={e}>
                  {e}
                </a>
              ))}
            </InfoRow>
          </div>

          <div className="min-h-[400px] border border-[#eee] bg-[#f9f9f9]">
            <iframe
              allowFullScreen
              className="h-full min-h-[400px] w-full border-0"
              loading="lazy"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3654.0!2d117.302891!3d31.806389!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzHCsDQ4JzIzLjAiTiAxMTfCsDE4JzEwLjQiRQ!5e0!3m2!1sen!2sus!4v1600000000000!5m2!1sen!2sus"
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

        {/* Contact icon list */}
        <div className="mt-10 border border-[#eee]">
          <ul className="grid grid-cols-1 divide-y divide-[#eee] sm:grid-cols-2 sm:divide-y-0 md:grid-cols-5">
            <ContactIconItem icon="💬" label="Skype">
              {CONTACT.skype.map((s) => (
                <a
                  className="block text-[#1c6dd0] hover:underline"
                  href={`skype:${s}?chat`}
                  key={s}
                >
                  {s}
                </a>
              ))}
            </ContactIconItem>
            <ContactIconItem icon="🐧" label="QQ">
              {CONTACT.qq.map((q) => (
                <a
                  className="block text-[#1c6dd0] hover:underline"
                  href={`http://wpa.qq.com/msgrd?v=3&uin=${q}&site=qq&menu=yes`}
                  key={q}
                  target="_blank"
                  rel="noreferrer"
                >
                  {q}
                </a>
              ))}
            </ContactIconItem>
            <ContactIconItem icon="📱" label="Mobile">
              {CONTACT.wechat.map((m) => (
                <span className="block" key={m}>
                  {m}
                </span>
              ))}
            </ContactIconItem>
            <ContactIconItem icon="💬" label="WhatsApp">
              {CONTACT.whatsapp.map((w) => (
                <span className="block" key={w}>
                  {w}
                </span>
              ))}
            </ContactIconItem>
            <ContactIconItem icon="✉" label="Email">
              {CONTACT.publicEmails.map((e) => (
                <a className="block text-[#1c6dd0] hover:underline" href={`mailto:${e}`} key={e}>
                  {e}
                </a>
              ))}
            </ContactIconItem>
          </ul>
        </div>

        {/* Official address */}
        <div className="mt-10 border-t border-[#eee] pt-8 text-[13px] leading-[26px] text-[#555]">
          <h3 className="mb-4 text-[16px] font-bold text-[#333]">Our Official Address</h3>
          <p>In English: Asia Pacific Industry Group Co., Limited</p>
          <p>No.3399 Luzhou Ave., Baohe Industrial District, 230051, Hefei city, Anhui Province, P.R.China</p>
          <p>Tel: 86-551-64687285 Mobile phone: 86-18919654871 Attn. Sunny Jiang</p>
          <p>In Chinese (中文): 亚太工业集团有限公司 安徽省合肥市包河区庐州大道3399号</p>
          <p>联系人：蒋先生 电话 0551-64687285 手机：18919654871</p>
          <p className="mt-2">
            <a className="text-[#1c6dd0] hover:underline" href="http://www.boppfilmsales.com" target="_blank" rel="noreferrer">
              http://www.boppfilmsales.com
            </a>
            <span className="mx-2"> </span>
            <a className="text-[#1c6dd0] hover:underline" href="http://www.apigcl.com" target="_blank" rel="noreferrer">
              http://www.apigcl.com
            </a>
          </p>
          <p className="mt-2">
            Email:{" "}
            <a className="text-[#1c6dd0] hover:underline" href="mailto:sales@boppfilmsales.com">
              sales@boppfilmsales.com
            </a>
            <span className="mx-1"> </span>
            <a className="text-[#1c6dd0] hover:underline" href="mailto:admin@apigcl.com">
              admin@apigcl.com
            </a>
          </p>
          <p className="mt-2">
            On-line contact information: teams: asiapacificsale QQ: 840715367
          </p>
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
