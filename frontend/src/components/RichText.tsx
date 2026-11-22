// frontend/src/components/RichText.tsx
//
// Renders Payload's Slate rich text (posts, pages, product descriptions).
// Text is rendered as React text, never as HTML, so CMS content cannot
// inject markup. Styling comes from the surrounding `prose` classes
// (@tailwindcss/typography).
//
// Elements: paragraphs, h1-h6, lists, blockquotes, links (only safe
// URLs, see safeUrl), uploaded images and indentation. Leaves: bold, italic,
// underline, strikethrough and inline code.

import Image from 'next/image';
import { Fragment, type ReactNode } from 'react';
import type { RichTextNode } from '@/types';
import { resolvePayloadMediaUrl } from '@/lib/utils/media';
import { isExternalUrl, safeUrl } from '@/lib/utils/safe-url';

const HEADINGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;
type Heading = (typeof HEADINGS)[number];

const isHeading = (type: string | undefined): type is Heading =>
  HEADINGS.includes(type as Heading);

// Text with its line breaks; React escapes it.
function renderText(text: string): ReactNode {
  const lines = text.split('\n');
  return lines.map((line, i) => (
    <Fragment key={i}>
      {i > 0 ? <br /> : null}
      {line}
    </Fragment>
  ));
}

function renderLeaf(node: RichTextNode, key: number): ReactNode {
  let content: ReactNode = renderText(node.text ?? '');
  if (node.code) content = <code>{content}</code>;
  if (node.bold) content = <strong>{content}</strong>;
  if (node.italic) content = <em>{content}</em>;
  if (node.underline) content = <u>{content}</u>;
  if (node.strikethrough) content = <s>{content}</s>;
  return <Fragment key={key}>{content}</Fragment>;
}

interface UploadValue {
  url?: string;
  alt?: string;
  width?: number;
  height?: number;
}

function renderUpload(node: RichTextNode, key: number): ReactNode {
  // An unpopulated upload (only an id) or a non-image has nothing to show.
  const value = node.value as UploadValue | string | number | undefined;
  if (!value || typeof value !== 'object' || !value.url) {
    return null;
  }
  const width = value.width ?? 1200;
  const height = value.height ?? 800;
  return (
    <figure key={key}>
      <Image
        src={resolvePayloadMediaUrl(value.url)}
        alt={value.alt ?? ''}
        width={width}
        height={height}
        sizes="(max-width: 768px) 100vw, 768px"
        style={{ width: '100%', height: 'auto' }}
        unoptimized
      />
      {value.alt ? <figcaption>{value.alt}</figcaption> : null}
    </figure>
  );
}

function renderLink(node: RichTextNode, key: number): ReactNode {
  const children = serialize(node.children ?? []);
  // Only safe destinations become links (no javascript: URLs from the
  // CMS); the text stays either way.
  const href = safeUrl(node.url);
  if (!href) {
    return <span key={key}>{children}</span>;
  }
  const newTab = node.newTab === true || isExternalUrl(href);
  return (
    <a
      key={key}
      href={href}
      {...(newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {children}
    </a>
  );
}

function serialize(nodes: RichTextNode[]): ReactNode {
  return nodes.map((node, i) => {
    if (!node) {
      return null;
    }
    if (typeof node.text === 'string') {
      return renderLeaf(node, i);
    }

    const children = serialize(node.children ?? []);

    if (isHeading(node.type)) {
      const Tag = node.type;
      return <Tag key={i}>{children}</Tag>;
    }

    switch (node.type) {
      case 'ul':
        return <ul key={i}>{children}</ul>;
      case 'ol':
        return <ol key={i}>{children}</ol>;
      case 'li':
        return <li key={i}>{children}</li>;
      case 'blockquote':
        return <blockquote key={i}>{children}</blockquote>;
      case 'link':
        return renderLink(node, i);
      case 'upload':
        return renderUpload(node, i);
      case 'indent':
        return (
          <div key={i} className="ms-8">
            {children}
          </div>
        );
      case undefined:
      case 'p':
      case 'paragraph':
        return <p key={i}>{children}</p>;
      default:
        // An element this storefront does not know (for example a new
        // editor feature): keep its content, without guessing at markup
        // that could nest a block inside a paragraph.
        return <Fragment key={i}>{children}</Fragment>;
    }
  });
}

export function RichText({ content }: { content: RichTextNode[] | null }) {
  if (!Array.isArray(content) || content.length === 0) {
    return null;
  }
  return <>{serialize(content)}</>;
}
