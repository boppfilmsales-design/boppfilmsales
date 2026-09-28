import { allPdfs } from "@/lib/site";

/**
 * "All Technical PDFs" section.
 *
 * Client-safe: it only depends on the JSON-backed `@/lib/site` helpers, never
 * on the D1 seed chain (`content-db` → `seed` → `node:fs`). That matters
 * because client components (`HomeContent`) import this module — pulling the
 * seed chain into a browser bundle breaks the production build
 * (`UnhandledSchemeError: Reading from "node:fs"`), and on the Worker it
 * would re-attach the ~784 KB site catalog to every cold start (Error 1102).
 */
export function AllPdfsSection({
  lang = "en",
  pdfs,
}: {
  lang?: "en" | "zh";
  pdfs?: { label: string; file: string; product: string }[];
}) {
  const productPdfs = pdfs ?? allPdfs();
  if (productPdfs.length === 0) return null;

  return (
    <section className="py-10 bg-[#f9fafb] border-t border-[#e5e7eb]">
      <div className="mx-auto w-full max-w-[1560px] px-4">
        <h2 className="text-[18px] font-bold text-[#22262e] mb-6 flex items-center gap-3">
          <span className="w-[5px] h-[18px] bg-[#c8102e] block" />
          {lang === "zh" ? "全部技术 PDF 资料" : "All Technical PDFs"}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {productPdfs.slice(0, 12).map((pdf) => (
            <a
              key={pdf.file}
              href={pdf.file}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 bg-white border border-[#e8e8e8] hover:border-[#c8102e] hover:shadow-md transition-all group"
            >
              <span className="flex h-[32px] w-[28px] shrink-0 items-center justify-center bg-[#c8102e] text-[9px] font-black text-white">
                PDF
              </span>
              <span className="truncate text-[12px] text-[#333] group-hover:text-[#c8102e]">
                {pdf.label || pdf.file.split("/").pop()}
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
