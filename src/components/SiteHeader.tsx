import Link from "next/link";

const NEWS_TABS = [
  { slug: "industry-news", name: "Industry News" },
  { slug: "company-news", name: "Company News" },
  { slug: "employees-literary", name: "Employees Literary" },
];

const NAV = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about" },
  { label: "News", href: "/news" },
  { label: "Products", href: "/products" },
  { label: "Contact", href: "/contact" },
];

export default function SiteHeader({ active }: { active?: string }) {
  return (
    <header className="bg-white">
      {/* Top strip: rolling welcome message + contact info + language switch */}
      <div className="border-b border-[#f3f3f3] bg-[#fbfbfb] text-[15px] leading-[50px] text-[#666]">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-4 px-3">
          <div className="hidden truncate text-[13px] md:block">
            Welcome to our website: www.apigcl.com &amp; www.boppfilmsales.com
          </div>
          <ul className="flex items-center gap-5 text-[13px]">
            <li className="hidden sm:block">Tel: 86-551-64687285</li>
            <li className="hidden md:block">
              <a className="hover:text-[#e61d39]" href="mailto:sales@boppfilmsales.com">
                sales@boppfilmsales.com
              </a>
            </li>
            <li>
              <Link className="hover:text-[#e61d39]" href="/news">
                English
              </Link>
            </li>
            <li>
              <Link className="font-bold text-[#e61d39]" href="/admin">
                Site background
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Logo + search */}
      <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-6 px-3 py-5">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-sm bg-[#e61d39] text-[18px] font-bold text-white">
            AP
          </span>
          <span className="leading-tight">
            <span className="block text-[19px] font-bold text-[#333]">
              Asia Pacific Industry Group Co., Limited
            </span>
            <span className="block text-[12px] text-[#888]">
              BOPP / BOPET / POF Film &amp; Tape Manufacturer &amp; Exporter
            </span>
          </span>
        </Link>
        <form action="/search" className="flex items-center border border-[#e5e5e5]" method="get">
          <input
            aria-label="Search"
            className="h-[38px] w-[180px] px-3 text-[13px] outline-none sm:w-[240px]"
            name="keyWord"
            placeholder="Search..."
            type="search"
          />
          <button
            className="h-[38px] bg-[#e61d39] px-4 text-[13px] font-bold text-white"
            type="submit"
          >
            Search
          </button>
        </form>
      </div>

      {/* Red navigation bar */}
      <nav className="bg-[#e61d39]">
        <ul className="mx-auto flex w-full max-w-[1200px] flex-wrap px-3">
          {NAV.map((item) => {
            const isActive = active === item.label;
            return (
              <li className="group relative" key={item.label}>
                <Link
                  className={`block px-5 text-[14px] font-bold leading-[42px] ${
                    isActive ? "bg-white text-[#e61d39]" : "text-white hover:bg-white hover:text-[#e61d39]"
                  }`}
                  href={item.href}
                >
                  {item.label}
                </Link>
                {item.label === "News" && (
                  <ul className="absolute left-0 z-30 hidden w-[220px] bg-[#fff] py-1 shadow-md group-hover:block">
                    {NEWS_TABS.map((tab) => (
                      <li key={tab.slug}>
                        <Link
                          className="block px-4 py-[9px] text-[13px] text-[#666] hover:bg-[#f6f6f6] hover:text-[#e61d39]"
                          href={`/news?category=${tab.slug}`}
                        >
                          {tab.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {item.label === "About Us" && (
                  <ul className="absolute left-0 z-30 hidden w-[220px] bg-[#fff] py-1 shadow-md group-hover:block">
                    {["About Us", "Main Products", "Culture", "Branch Companies", "Factory & Warehouse"].map(
                      (sub) => (
                        <li key={sub}>
                          <Link
                            className="block px-4 py-[9px] text-[13px] text-[#666] hover:bg-[#f6f6f6] hover:text-[#e61d39]"
                            href="/about"
                          >
                            {sub}
                          </Link>
                        </li>
                      ),
                    )}
                  </ul>
                )}
                {item.label === "Products" && (
                  <ul className="absolute left-0 z-30 hidden w-[260px] bg-[#fff] py-1 shadow-md group-hover:block">
                    {[
                      "BOPET Film (Polyester Film)",
                      "BOPP Film (Polypropylene film)",
                      "BOPP Packing Tape Jumbo Rolls",
                      "BOPP/BOPET Thermal Laminating Film",
                      "POF Shrink Film (Polyolefin)",
                      "BOPS Window Envelope Film",
                    ].map((sub) => (
                      <li key={sub}>
                        <Link
                          className="block px-4 py-[9px] text-[13px] text-[#666] hover:bg-[#f6f6f6] hover:text-[#e61d39]"
                          href="/products"
                        >
                          {sub}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {item.label === "Contact" && (
                  <ul className="absolute left-0 z-30 hidden w-[220px] bg-[#fff] py-1 shadow-md group-hover:block">
                    {["Contact us", "Get Contacts", "Send Inquiry", "Feedback"].map((sub) => (
                      <li key={sub}>
                        <Link
                          className="block px-4 py-[9px] text-[13px] text-[#666] hover:bg-[#f6f6f6] hover:text-[#e61d39]"
                          href="/contact"
                        >
                          {sub}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
