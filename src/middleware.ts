import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// These routes read `?id=` / `?c_id=` search params at request time (force-dynamic),
// so they must never be served from a shared CDN cache — otherwise a stale render of
// the default column would be returned for every other column URL.
const NO_STORE_PREFIXES = ["/about", "/honor", "/cases", "/service", "/product-lines", "/zh"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const shouldNoStore = NO_STORE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  if (!shouldNoStore) return NextResponse.next();

  const res = NextResponse.next();
  res.headers.set("Cache-Control", "no-store, must-revalidate");
  return res;
}

export const config = {
  matcher: [
    "/about/:path*",
    "/honor/:path*",
    "/cases/:path*",
    "/service/:path*",
    "/product-lines/:path*",
    "/zh/:path*",
  ],
};
