import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Legacy URL compatibility: index.php -> / */
export function GET() {
  redirect("/");
}
