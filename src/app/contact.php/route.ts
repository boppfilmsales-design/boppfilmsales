import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Legacy URL compatibility: contact.php -> /contact */
export function GET() {
  redirect("/contact");
}
