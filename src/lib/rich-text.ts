/**
 * Sanitise rich-text HTML that was pasted from the legacy site / office docs /
 * QQ空间 before rendering it on the public site.
 *
 * Pasted content tends to carry junk that breaks the front end:
 *  - wrapper divs with fixed `height`/`width` that visually CLIP the article
 *    (a QZone paste wrapped a whole poem in `height:70px` and the page cut off
 *    half of it);
 *  - `background-image` pointing at paths that only exist on the source site;
 *  - piles of empty <p>/<h2>/<h3> tags that render as blank bands between
 *    paragraphs, making the content look sparse.
 *
 * This is display-side only: the admin editor still shows the raw pasted HTML.
 */

/** Property names that are always junk in a pasted rich-text body. */
const JUNK_PROPERTIES = new Set([
  // Fixed heights clip whatever follows (the truncation bug). Fixed widths on
  // block elements break narrow/mobile layouts; tables/cols keep theirs.
  "height",
  "width",
  // Absolute positioning / offsets from the source layout.
  "position",
  "top",
  "left",
  "right",
  "bottom",
  "z-index",
]);

function isJunkDeclaration(decl: string): boolean {
  const trimmed = decl.trim().toLowerCase();
  if (!trimmed) return true;

  // Grab the property name (everything before the first colon).
  const prop = trimmed.split(":")[0]?.trim();
  if (prop && JUNK_PROPERTIES.has(prop)) return true;

  // Backgrounds referencing source-site-only assets (/qzone/..., images/...).
  if (/^background-image\s*:/i.test(trimmed) && /url\(/i.test(trimmed)) return true;

  return false;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&quot;/gi, '"')
    .replace(/&#34;/gi, '"')
    .replace(/&amp;/gi, "&")
    .replace(/&#38;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function encodeStyleQuotes(value: string): string {
  return value.replace(/"/g, "&quot;");
}

function cleanStyleAttr(style: string): string {
  // Decode HTML entities so declarations like `background-image: url(&quot;...&quot;)`
  // are treated as a single declaration instead of being split at the entity semicolons.
  const decoded = decodeHtmlEntities(style);
  const declarations = decoded
    .split(";")
    .filter((d) => !isJunkDeclaration(d))
    .map((d) => d.trim())
    .filter(Boolean);
  return encodeStyleQuotes(declarations.join("; "));
}

/** Empty blocks (or blocks holding only <br>/&nbsp;) render as blank bands. */
const EMPTY_BLOCK = [
  /<(p|h[1-6]|div|li)([^>]*)>(?:\s|&nbsp;|&#160;|<br\s*\/?>)*<\/\1>/gi,
];

export function sanitizeRichHtml(html: string | null | undefined): string {
  if (!html) return html ?? "";

  let out = html;

  // 1) <style> blocks pasted from web pages would leak site-wide CSS.
  out = out.replace(/<style[\s\S]*?<\/style>/gi, "");
  // 2) drop script blocks and event handlers
  out = out.replace(/<script[\s\S]*?<\/script>/gi, "");
  out = out.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");

  // 3) scrub junk declarations from inline styles (keep colours/fonts/align)
  out = out.replace(/(\s?)style="([^"]*)"/gi, (_m, leading: string, style: string) => {
    const cleaned = cleanStyleAttr(style);
    if (!cleaned) return leading || "";
    return `${leading || " "}style="${cleaned}"`;
  });

  // 4) remove empty blocks repeatedly (nested empties reveal more empties)
  for (let pass = 0; pass < 4; pass += 1) {
    const before = out;
    for (const re of EMPTY_BLOCK) out = out.replace(re, "");
    if (out === before) break;
  }

  // 5) collapse runs of 3+ <br> down to a single one
  out = out.replace(/(?:<br\s*\/?>\s*){3,}/gi, "<br />");

  // 6) clean up stray whitespace left behind by removed attributes
  out = out.replace(/\s+>/g, ">");

  // 7) strip inter-tag whitespace (newlines/tabs between > and <) so that
  //    the browser does not render stray line-breaks from the editor source.
  out = out.replace(/>\s+</g, "><");

  return out;
}
