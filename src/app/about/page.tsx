import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "About Us - Asia Pacific Industry Group Co., Limited",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="About Us" />
      <section className="border-b border-[#f0f0f0] bg-[#fafafa]">
        <div className="mx-auto w-full max-w-[1200px] px-3">
          <p className="text-[14px] leading-[55px] text-[#666]">
            <span className="mr-2 inline-block h-[14px] w-[3px] bg-[#e61d39] align-middle" />
            <span className="font-bold text-[#e61d39]">Home</span> / About Us
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto w-full max-w-[1200px] px-3">
          <h1 className="text-center text-[30px] font-bold uppercase text-[#e61d39]">About Us</h1>
          <i className="mx-auto mt-[15px] block h-[5px] w-[92px] bg-[#e61d39]" />
          <div className="mt-10 space-y-5 text-[14px] leading-[28px] text-[#555]">
            <p>
              Asia Pacific Industry Group Co., Limited is a professional manufacturer and exporter of
              biaxially oriented polypropylene (BOPP) film, polyester (BOPET) film, POF shrink film, BOPS
              window envelope film, BOPP packing tape jumbo rolls and thermal laminating film. Our
              production base and marketing office are located in Hefei, Anhui Province, China.
            </p>
            <p>
              The products are widely used in food, medicine, cigarette, electric capacitor, printing and
              laminating, tape converting and flexible packaging industries. Export markets cover Europe,
              North and South America, the Middle East, South East Asia and Africa.
            </p>
            <p>
              Our philosophy is &ldquo;quality first, service to buyers, benefit to markets&rdquo;. Every
              container is inspected before shipment and each order is supported by full documentation,
              competitive pricing and fast online communication.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              { t: "Address", v: "NO.3399 LUZHOU AVE., BAOHE DIST., 230051, HEFEI, ANHUI, CHINA" },
              { t: "Telephone", v: "86-551-64687285 / Mobile 86-18919654871" },
              { t: "E-mail", v: "sales@boppfilmsales.com / admin@apigcl.com" },
            ].map((item) => (
              <div className="border border-[#eee] bg-[#fafafa] p-6" key={item.t}>
                <h3 className="text-[15px] font-bold uppercase text-[#e61d39]">{item.t}</h3>
                <p className="mt-2 text-[13px] leading-[24px] text-[#666]">{item.v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
