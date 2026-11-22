// frontend/src/lib/utils/safe-next.ts
//
// Where to go after logging in (?next=). Only paths on this site are
// accepted, so a crafted link cannot send the customer elsewhere after
// they type their password.

// Control characters (tabs, newlines) are stripped by browsers, which can
// turn a harmless-looking path into another site.
function hasControlCharacter(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) {
      return true;
    }
  }
  return false;
}

export function safeNextPath(value: string | null | undefined): string {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    // //evil.example and /\evil.example are other sites to a browser.
    value.startsWith('//') ||
    value.startsWith('/\\') ||
    hasControlCharacter(value)
  ) {
    return '/';
  }
  return value;
}

// The login page, returning to path afterwards.
export function loginPathFor(path: string): string {
  return `/login?next=${encodeURIComponent(safeNextPath(path))}`;
}
