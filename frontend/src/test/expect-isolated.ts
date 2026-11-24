// frontend/src/test/expect-isolated.ts
//
// For tests of rendered markup: asserts that text from data is isolated
// from the sentence around it (lib/bidi.ts has the rules), so a product
// name in English inside a Persian line can't scramble it.

import { expect } from 'vitest';

const escapeRegExp = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function expectIsolated(html: string, text: string) {
  const t = escapeRegExp(text);
  const isolated = new RegExp(
    [
      // <bdi>text</bdi> or <bdi dir="ltr">text</bdi>
      `<bdi(?: dir="ltr")?>${t}</bdi>`,
      // FSI text PDI in a plain string
      `\u2068${t}\u2069`,
    ].join('|'),
  );
  expect(html, `"${text}" is not isolated in:\n${html}`).toMatch(isolated);
}
