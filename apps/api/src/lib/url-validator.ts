/**
 * Validate destination URLs before storing them.
 * Block dangerous schemes and obvious abuse patterns.
 */

const BLOCKED_SCHEMES = new Set([
  'javascript:',
  'data:',
  'file:',
  'vbscript:',
  'about:',
  'chrome:',
  'chrome-extension:',
  'moz-extension:',
]);

const ALLOWED_SCHEMES = new Set(['http:', 'https:', 'tel:', 'mailto:', 'sms:']);

export interface ValidationResult {
  ok: boolean;
  url?: string;
  error?: string;
}

export function validateDestinationUrl(input: string): ValidationResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: 'URL is required.' };
  if (trimmed.length > 2048) return { ok: false, error: 'URL is too long.' };

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: 'Invalid URL format.' };
  }

  const scheme = parsed.protocol.toLowerCase();
  if (BLOCKED_SCHEMES.has(scheme)) {
    return { ok: false, error: `URLs using the ${scheme} scheme are not allowed.` };
  }
  if (!ALLOWED_SCHEMES.has(scheme)) {
    return { ok: false, error: `URL scheme ${scheme} is not allowed.` };
  }

  if (scheme === 'http:' || scheme === 'https:') {
    const host = parsed.hostname.toLowerCase();
    if (!host || host === 'localhost' || host.endsWith('.local')) {
      return { ok: false, error: 'Local hostnames are not allowed.' };
    }
    if (/^(\d+\.){3}\d+$/.test(host)) {
      if (
        host.startsWith('10.') ||
        host.startsWith('192.168.') ||
        host.startsWith('127.') ||
        host.startsWith('0.') ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(host)
      ) {
        return { ok: false, error: 'Private IP addresses are not allowed.' };
      }
    }
  }

  return { ok: true, url: parsed.toString() };
}
