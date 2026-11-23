// backend/payload-cms/src/seed/richText.ts
//
// Small builders for Slate rich text (the editor this CMS uses), so seed
// content reads like the document it produces.

export type RichTextNode = Record<string, unknown>;
type Inline = string | RichTextNode;

const inline = (children: Inline[]): RichTextNode[] =>
  children.map((child) =>
    typeof child === 'string' ? { text: child } : child,
  );

export const p = (...children: Inline[]): RichTextNode => ({
  type: 'p',
  children: inline(children),
});

export const h2 = (text: string): RichTextNode => ({
  type: 'h2',
  children: [{ text }],
});

export const h3 = (text: string): RichTextNode => ({
  type: 'h3',
  children: [{ text }],
});

export const bold = (text: string): RichTextNode => ({ text, bold: true });

export const ul = (...items: Inline[][]): RichTextNode => ({
  type: 'ul',
  children: items.map((item) => ({ type: 'li', children: inline(item) })),
});

export const link = (
  url: string,
  text: string,
  newTab = false,
): RichTextNode => ({
  type: 'link',
  linkType: 'custom',
  url,
  newTab,
  children: [{ text }],
});
