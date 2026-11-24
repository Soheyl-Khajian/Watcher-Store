import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createFormatter } from './format';
import { createTranslator, type MessageKey, type Messages } from './messages';
import fa from './messages/fa.json';

const t = createTranslator('fa', fa, createFormatter('fa', 'Asia/Tehran'));

// A stand-in English file with plural forms, to test plural choice before
// the real one exists.
const english = {
  ...fa,
  cart: {
    ...fa.cart,
    itemCount: { one: '{count} item', other: '{count} items' },
  },
} as unknown as Messages;
const en = createTranslator('en', english, createFormatter('en', 'UTC'));

describe('messages', () => {
  it('looks up a message by key', () => {
    expect(t('cart.title')).toBe('سبد خرید شما');
  });

  it("writes numbers in the page's language", () => {
    expect(t('stock.in', { count: 12 })).toBe('۱۲ عدد در انبار');
  });

  it('isolates text from data', () => {
    expect(t('cart.added', { name: 'Galaxy Watch' })).toBe(
      '⁨Galaxy Watch⁩ به سبد خرید اضافه شد.',
    );
  });

  it('puts other messages in by reference', () => {
    expect(
      t('validation.required', { field: { key: 'validation.fields.city' } }),
    ).toBe('شهر را وارد کنید.');
    expect(t.ref({ key: 'orders.status.pending' })).toBe('در انتظار پرداخت');
  });

  it('chooses plural forms by count', () => {
    expect(en('cart.itemCount', { count: 1 })).toBe('1 item');
    expect(en('cart.itemCount', { count: 3 })).toBe('3 items');
  });

  it('places elements inside a sentence', () => {
    const html = renderToStaticMarkup(
      createElement(
        'p',
        null,
        t.rich('products.noMatch', {
          query: createElement('bdi', null, 'lock'),
        }),
      ),
    );
    expect(html).toBe('<p>محصولی با عبارت «<bdi>lock</bdi>» پیدا نشد.</p>');
  });

  it('shows the key of a missing message rather than nothing', () => {
    expect(t('cart.nope' as MessageKey)).toBe('cart.nope');
  });
});
