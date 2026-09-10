import Link from "next/link";

type Props = {
  page: number;
  pages: number;
  total: number;
  perPage: number;
  buildHref: (page: number) => string;
};

/** Pagination markup that mirrors the legacy `news.php` page bar. */
export default function Pagination({ page, pages, total, perPage, buildHref }: Props) {
  const numbers: number[] = [];
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  const end = Math.min(pages, start + 4);
  for (let i = start; i <= end; i += 1) numbers.push(i);

  const linkClass =
    "inline-block border border-[#dedede] px-[13px] h-[30px] leading-[30px] text-[12px] text-[#6c6c6d] ml-[5px] hover:bg-[#e61d39] hover:border-[#e61d39] hover:text-white";

  return (
    <div className="page">
      <div className="mt-10 flex flex-wrap items-center justify-center gap-y-2">
        <span className="mr-[5px] inline-block h-[30px] border border-[#dedede] px-[13px] text-[12px] leading-[30px] text-[#6c6c6d]">
          {total} row / {perPage} per page
        </span>
        <Link className={linkClass} href={buildHref(1)}>
          first
        </Link>
        <Link
          aria-disabled={page <= 1}
          className={`${linkClass} ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}
          href={buildHref(Math.max(1, page - 1))}
        >
          previous
        </Link>
        {numbers.map((n) => (
          <Link
            className={
              n === page
                ? "ml-[5px] inline-block h-[30px] border border-[#e61d39] bg-[#e61d39] px-[13px] text-[12px] leading-[30px] text-white"
                : linkClass
            }
            href={buildHref(n)}
            key={n}
          >
            {n}
          </Link>
        ))}
        <Link
          aria-disabled={page >= pages}
          className={`${linkClass} ${page >= pages ? "pointer-events-none opacity-40" : ""}`}
          href={buildHref(Math.min(pages, page + 1))}
        >
          next
        </Link>
        <Link className={linkClass} href={buildHref(pages)}>
          end
        </Link>
      </div>
    </div>
  );
}
