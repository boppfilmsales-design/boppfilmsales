import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Legacy URL compatibility: product.php -> /products */
export function GET() {
  redirect("/products");
}
