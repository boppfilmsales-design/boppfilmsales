import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Products - Asia Pacific Industry Group Co., Limited",
};

const GROUPS = [
  {
    title: "BOPET Film (Polyester Film)",
    items: [
      "BOPET Thermal Transfer Film 4.5Microns Clear",
      "BOPET Plain Film Printing & Laminating",
      "BOPET Capacitor Film Clear & Metallized",
      "Vacuum Aluminum Metallized BOPET Polyester Film",
      "BOPET Insulating Thicker Film (50-500 Microns)",
      "BOPET Milky/White Film",
      "B Grade BOPET Film",
    ],
  },
  {
    title: "BOPP Film (Polypropylene film)",
    items: [
      "BOPP Printing & Laminating Film",
      "BOPP Heat Sealable Film",
      "BOPP Pearlized Film",
      "BOPP Tobacco Cigarette Wrapping Film",
      "BOPP Flower Wrapping Film",
      "BOPP Capacitor Film",
      "BOPP ZN/AL Metallized Capacitor Film Silver",
      "BOPP Matte Film (15,18,20 Microns)",
      "BOPP Metallized film aluminium silver",
    ],
  },
  {
    title: "Tape, Lamination & Special Films",
    items: [
      "BOPP Packing Tape Jumbo Rolls",
      "BOPP/BOPET Thermal Laminating Film coated EVA",
      "POF Shrink Film (Polyolefin)",
      "BOPS Window Envelope Film",
      "BOPP Office Use Bags",
      "BOPP Anti-Fog Film",
    ],
  },
];

export default function ProductsPage() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="Products" />
      <section className="border-b border-[#f0f0f0] bg-[#fafafa]">
        <div className="mx-auto w-full max-w-[1200px] px-3">
          <p className="text-[14px] leading-[55px] text-[#666]">
            <span className="mr-2 inline-block h-[14px] w-[3px] bg-[#e61d39] align-middle" />
            <span className="font-bold text-[#e61d39]">Home</span> / Products
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto w-full max-w-[1200px] px-3">
          <h1 className="text-center text-[30px] font-bold uppercase text-[#e61d39]">Products</h1>
          <i className="mx-auto mt-[15px] block h-[5px] w-[92px] bg-[#e61d39]" />
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {GROUPS.map((group) => (
              <div className="border border-[#eee]" key={group.title}>
                <h2 className="bg-[#f8f8f8] px-5 py-4 text-[15px] font-bold text-[#333]">{group.title}</h2>
                <ul className="p-5">
                  {group.items.map((item) => (
                    <li
                      className="border-b border-dotted border-[#eee] py-2 text-[13px] leading-[22px] text-[#666] last:border-0"
                      key={item}
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-[13px] text-[#888]">
            For specifications, COA/TDS sheets, container loadings and price lists please contact{" "}
            <a className="text-[#e61d39] hover:underline" href="mailto:sales@boppfilmsales.com">
              sales@boppfilmsales.com
            </a>
          </p>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
