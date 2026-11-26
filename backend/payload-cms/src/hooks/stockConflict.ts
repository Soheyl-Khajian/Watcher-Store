// backend/payload-cms/src/hooks/stockConflict.ts
//
// Stock changes in two places: administrators edit it here, and the order
// API takes and returns it as customers buy and orders are cancelled. The
// product form sends back every field, so saving a product opened before a
// sale would put the old stock back and the shop would oversell.
//
// The form carries the stock it showed (stockWhenOpened, a hidden field
// that is never stored). When stock changed since then:
// - the administrator left stock alone: the current stock is kept;
// - the administrator typed a new stock: the save is refused, with the
//   current number, so they can decide again.
// Saves without stockWhenOpened (API clients, seeds) are not affected.

import { ValidationError, type CollectionBeforeChangeHook } from 'payload';

export const STOCK_WHEN_OPENED = 'stockWhenOpened';

const asCount = (value: unknown): number | undefined => {
  const number = typeof value === 'string' ? Number(value) : value;
  return typeof number === 'number' && Number.isInteger(number)
    ? number
    : undefined;
};

export const keepStockFromSales: CollectionBeforeChangeHook = ({
  data,
  originalDoc,
  operation,
  req,
}) => {
  const seen = asCount(data[STOCK_WHEN_OPENED]);
  delete data[STOCK_WHEN_OPENED];

  if (operation !== 'update' || seen === undefined) {
    return data;
  }

  const current = asCount(originalDoc?.stock);
  if (current === undefined || current === seen) {
    return data;
  }

  const submitted = asCount(data.stock);
  if (submitted === undefined || submitted === seen) {
    data.stock = current;
    return data;
  }

  throw new ValidationError({
    collection: 'products',
    errors: [
      {
        path: 'stock',
        // Short: the admin shows it in a one-line tooltip on the field.
        message: `موجودی الان ${current} است؛ صفحه را تازه کنید.`,
      },
    ],
    req,
  });
};
