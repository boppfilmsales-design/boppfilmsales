/**
 * Build-time log suppression.
 *
 * `next build` renders every page once. On Vercel the data layer deliberately
 * reports "no database" during that pass (see `src/db/index.ts`) so each page
 * falls back to the build-time snapshot in `src/data/`. That fallback is normal
 * and expected — but every call site used to print a full stack trace:
 *
 *     [home-live] product query failed, falling back to the static seed: Error: …
 *         at … (9 lines)
 *
 * With ~315 pages each attempting several queries, that produced >12,000 stderr
 * lines. Vercel aborts a build that floods its log, which left `.next`
 * half-written and surfaced as:
 *
 *     ENOENT: no such file or directory, lstat '/vercel/path0/.next/lock'
 *
 * These helpers keep the messages outside the build phase — where an operator
 * genuinely needs them — and stay quiet while pre-rendering, where the fallback
 * is the designed behaviour rather than a fault.
 */

/** True while `next build` (or `next export`) is evaluating pages. */
export function isBuildPhase(): boolean {
  const phase = process.env.NEXT_PHASE;
  return phase === "phase-production-build" || phase === "phase-export";
}

/** `console.error`, silenced during the build phase. */
export function logDbFallback(label: string, error?: unknown): void {
  if (isBuildPhase()) return;
  if (error === undefined) console.error(label);
  else console.error(label, error);
}

/** `console.warn`, silenced during the build phase. */
export function warnDbFallback(label: string, error?: unknown): void {
  if (isBuildPhase()) return;
  if (error === undefined) console.warn(label);
  else console.warn(label, error);
}
