// frontend/src/test/i18n.ts
//
// Renders a component inside a page's language, as the storefront's
// document shell would, for tests of rendered markup.

import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { messagesFor } from '@/i18n/catalog';
import { I18nProvider } from '@/i18n/client';
import type { Locale } from '@/i18n/config';
import { createFormatter } from '@/i18n/format';
import { createTranslator, type MessageRef } from '@/i18n/messages';

export function renderIn(element: ReactElement, locale: Locale = 'fa') {
  return renderToStaticMarkup(
    createElement(
      I18nProvider,
      {
        locale,
        enabledLocales: [locale],
        messages: messagesFor(locale),
      },
      element,
    ),
  );
}

const persian = createTranslator(
  'fa',
  messagesFor('fa'),
  createFormatter('fa', 'Asia/Tehran'),
);

// A message as a Persian page shows it, for tests of code that returns
// messages rather than text.
export function inPersian(message: MessageRef | null | undefined) {
  return message ? persian.ref(message) : message;
}
