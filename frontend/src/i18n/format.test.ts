import { describe, expect, it } from 'vitest';
import { createFormatter } from './format';

const fa = createFormatter('fa', 'Asia/Tehran');
const en = createFormatter('en', 'Asia/Tehran');

describe('formatting by language', () => {
  it('groups numbers with each language’s digits', () => {
    expect(fa.number(1250000)).toBe('۱٬۲۵۰٬۰۰۰');
    expect(en.number(1250000)).toBe('1,250,000');
  });

  it('writes order and page numbers without grouping', () => {
    expect(fa.digits(1024)).toBe('۱۰۲۴');
    expect(en.digits(1024)).toBe('1024');
  });

  it('prices in toman in every language', () => {
    expect(fa.toman(690000)).toBe('۶۹۰٬۰۰۰ تومان');
    expect(en.toman(690000)).toBe('690,000 Toman');
    expect(en.tomanUnit).toBe('Toman');
  });

  it('uses the Persian calendar in Persian and the Gregorian in English', () => {
    // 2026-11-24 is 3 Azar 1405.
    const day = '2026-11-24T08:00:00.000Z';
    expect(fa.date(day)).toBe('۳ آذر ۱۴۰۵');
    expect(en.date(day)).toBe('November 24, 2026');
  });

  it('shows times in the store’s time zone', () => {
    // 20:45 UTC is 00:15 the next day in Tehran (UTC+3:30).
    const late = '2026-11-24T20:45:00.000Z';
    expect(en.dateTime(late)).toContain('Nov 25, 2026');
    expect(en.dateTime(late)).toContain('12:15');
    expect(createFormatter('en', 'UTC').dateTime(late)).toContain('8:45');
  });

  it('shows a date it cannot read as it came', () => {
    expect(en.date('not a date')).toBe('not a date');
  });
});
