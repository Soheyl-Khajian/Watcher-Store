// frontend/src/lib/utils/safe-url.ts
//
// Links typed into the CMS (rich text, footer) end up in href attributes.
// A javascript: or data: URL there runs code in the customer's browser when
// clicked, so only these are rendered as links:
// - paths on this site (/about-us, about-us, #section, ?page=2)
// - http(s), mailto: and tel: URLs
// Anything else returns null and is shown as plain text.

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);

// Browsers ignore tabs and newlines inside URLs, which hides schemes such
// as "java\tscript:" from naive checks.
function hasControlCharacter(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) {
      return true;
    }
  }
  return false;
}

export function safeUrl(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const url = value.trim();
  if (!url || hasControlCharacter(url)) {
    return null;
  }

  // //host and /\host point to another site with the current scheme.
  if (url.startsWith('//') || url.startsWith('/\\')) {
    return null;
  }
  if (url.startsWith('/') || url.startsWith('#') || url.startsWith('?')) {
    return url;
  }

  // A scheme is whatever comes before the first ":" if that ":" appears
  // before any "/", "?" or "#". Without one, the URL is a relative path.
  const scheme = /^([^/?#]*?):/.exec(url);
  if (!scheme) {
    return url;
  }

  try {
    return ALLOWED_PROTOCOLS.has(new URL(url).protocol) ? url : null;
  } catch {
    return null;
  }
}

// Whether a safe URL leaves this site (opened with rel="noopener").
export function isExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}
