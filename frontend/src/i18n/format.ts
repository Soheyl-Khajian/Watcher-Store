// frontend/src/i18n/format.ts
//
// Numbers, prices and dates in the page's language: Persian digits and
// the Persian (solar) calendar on Persian pages, Latin digits and the
// Gregorian calendar on English ones. Prices are in toman in every
// language. Times show in the store's time zone (STORE_TIME_ZONE), not
// the visitor's, so an order's time reads the same for staff and customer.

import { LOCALE_INFO, type Locale } from './config';

// The currency's name in each language; prices are toman everywhere.
const TOMAN: Record<Locale, string> = { fa: 'تومان', en: 'Toman' };

export interface Formatter {
  // 1,234,567 or ۱٬۲۳۴٬۵۶۷
  number(value: number): string;
  // Without grouping, for order numbers and page numbers: 1234 or ۱۲۳۴
  digits(value: number): string;
  // The price with its currency: "1,250,000 Toman"
  toman(value: number): string;
  // The currency's name alone, for layouts that set it apart.
  tomanUnit: string;
  // A day: "November 24, 2026" or "۳ آذر ۱۴۰۵"
  date(value: string | Date): string;
  // A day and time: "Nov 24, 2026, 6:30 PM"
  dateTime(value: string | Date): string;
  // The year in the page's calendar: 2026 or ۱۴۰۵
  year(value: string | Date): string;
}

export function createFormatter(locale: Locale, timeZone: string): Formatter {
  const { tag } = LOCALE_INFO[locale];
  const grouped = new Intl.NumberFormat(tag);
  const plain = new Intl.NumberFormat(tag, { useGrouping: false });
  const day = new Intl.DateTimeFormat(tag, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone,
  });
  const moment = new Intl.DateTimeFormat(tag, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  });
  const yearOnly = new Intl.DateTimeFormat(tag, { year: 'numeric', timeZone });
  // An unparseable date shows as it came rather than as "Invalid Date".
  const asDate = (value: string | Date, format: Intl.DateTimeFormat) => {
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : format.format(date);
  };

  return {
    number: (value) => grouped.format(value),
    digits: (value) => plain.format(value),
    toman: (value) => `${grouped.format(value)} ${TOMAN[locale]}`,
    tomanUnit: TOMAN[locale],
    date: (value) => asDate(value, day),
    dateTime: (value) => asDate(value, moment),
    year: (value) => asDate(value, yearOnly),
  };
}
