// frontend/src/lib/bidi.ts
//
// Keeping text readable when right-to-left (Persian) and left-to-right
// (English) text meet. Product names, emails, addresses, search terms: any
// text that comes from the database or the user may be in either
// direction. Placed inside a sentence without isolation, the characters
// around it (×, —, digits, brackets) attach to the wrong side and the line
// reads scrambled.
//
// The rules (see components/ui/bidi.tsx for the JSX side):
// - text from data: wrap it in <Bidi>, also when it is an element's whole
//   content (an English title ending in "(2024)" or "." otherwise shows
//   the bracket or dot on the wrong side), and the element keeps the
//   page's alignment;
// - text from data in a plain string, such as a toast: isolate();
// - always-left-to-right values (emails, codes, phone numbers): <Bidi ltr>.
//   Inputs keep the page's direction: dir="auto" on an empty input falls
//   back to left to right, which moves the caret and placeholder.

// First Strong Isolate and Pop Directional Isolate: the plain-text
// equivalent of <bdi>. Invisible; the text inside takes its own direction
// and the surrounding sentence treats it as one unit.
const FSI = '\u2068';
const PDI = '\u2069';

export function isolate(text: string | number): string {
  return `${FSI}${text}${PDI}`;
}
