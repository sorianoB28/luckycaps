/**
 * Pre-fix repro (2026-02-07) hitting GET /api/admin/products in dev crashed with:
 * Error: A "use server" file can only export async functions, found object.
 *     at ensureServerEntryExports (node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js:18:19)
 * Cause: this module previously had `"use server"` and exported TARGETS (non-async), and was imported by the admin products API route.
 * The logic now lives in a plain server-only helper to keep route handlers outside Server Actions.
 */
export { translateText, TARGETS, type TargetLang } from "./deeplClient";
