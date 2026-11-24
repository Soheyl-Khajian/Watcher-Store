// backend/payload-cms/src/utils/bidi.ts
//
// Readable mixed Persian and English text in the admin views. Text from
// data (product names, emails, addresses) may run in either direction;
// inside a sentence it needs isolating, or the digits and marks around it
// (×, —, prices) attach to the wrong side. In JSX use <bdi>; in a plain
// string use isolate(). The storefront has the same rules in
// frontend/src/lib/bidi.ts.

// First Strong Isolate and Pop Directional Isolate: the plain-text <bdi>.
const FSI = '\u2068';
const PDI = '\u2069';

export function isolate(text: string | number): string {
  return `${FSI}${text}${PDI}`;
}
