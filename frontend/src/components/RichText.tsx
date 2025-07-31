// src/components/RichText.tsx
import React, { Fragment } from 'react';
import escapeHTML from 'escape-html';
import { Text } from 'slate';

// تعریف تایپ‌ها بر اساس ساختار Rich Text پیلود
type RichTextNode = {
  type?: string;
  value?: {
    url: string;
    alt: string;
  };
  children?: RichTextNode[];
  url?: string;
  [key: string]: unknown;
  text?: string;
};

// کامپوننت اصلی برای رندر کردن
export const RichText: React.FC<{ content: RichTextNode[] }> = ({
  content,
}) => {
  if (!content) {
    return null;
  }

  // تابع بازگشتی برای رندر هر نود
  const serialize = (nodes: RichTextNode[]): React.ReactNode => {
    return nodes.map((node, i) => {
      if (Text.isText(node)) {
        let text = (
          <span
            dangerouslySetInnerHTML={{
              __html: escapeHTML(node.text).replace(/\n/g, '<br>'),
            }}
          />
        );
        if (node.bold) {
          text = <strong key={i}>{text}</strong>;
        }
        if (node.italic) {
          text = <em key={i}>{text}</em>;
        }
        if (node.underline) {
          text = <u key={i}>{text}</u>;
        }
        return <Fragment key={i}>{text}</Fragment>;
      }

      if (!node) {
        return null;
      }

      switch (node.type) {
        case 'h2':
          return <h2 key={i}>{serialize(node.children || [])}</h2>;
        case 'h3':
          return <h3 key={i}>{serialize(node.children || [])}</h3>;
        case 'h4':
          return <h4 key={i}>{serialize(node.children || [])}</h4>;
        case 'ul':
          return <ul key={i}>{serialize(node.children || [])}</ul>;
        case 'ol':
          return <ol key={i}>{serialize(node.children || [])}</ol>;
        case 'li':
          return <li key={i}>{serialize(node.children || [])}</li>;
        case 'link':
          return (
            <a href={escapeHTML(node.url)} key={i}>
              {serialize(node.children || [])}
            </a>
          );

        default: // به صورت پیش‌فرض، پاراگراف در نظر می‌گیریم
          return <p key={i}>{serialize(node.children || [])}</p>;
      }
    });
  };

  return <>{serialize(content)}</>;
};
