import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Legacy URL compatibility: about.php (About Us / Culture / Branch Companies ...) -> /about */
export function GET() {
  redirect("/about");
}
