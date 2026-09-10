import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Legacy URL compatibility: search.php?keyWord=bopp -> /search?keyWord=bopp */
export function GET(request: Request) {
  const keyword = new URL(request.url).searchParams.get("keyWord") ?? "";
  redirect(`/search?keyWord=${encodeURIComponent(keyword)}`);
}
