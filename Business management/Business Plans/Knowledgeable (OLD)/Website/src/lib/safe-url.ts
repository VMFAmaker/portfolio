/**
 * Returns the URL only if it is an absolute http(s) link. Anything else — `javascript:`,
 * `data:`, relative paths, malformed strings — returns null, so untrusted text (for example
 * AI-generated sources) can never become a script-executing link.
 */
export function safeExternalUrl(value: string | undefined | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}
