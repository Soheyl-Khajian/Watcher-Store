import { describe, expect, it } from 'vitest';
import { normalizeSearchQuery, SEARCH_MAX_LENGTH } from './search';

describe('normalizeSearchQuery', () => {
  it('trims and collapses spaces', () => {
    expect(normalizeSearchQuery('  دوربین    بولت  ')).toBe('دوربین بولت');
  });

  it('turns Arabic yeh and kaf into the Persian letters', () => {
    expect(normalizeSearchQuery('دوربين كوچك')).toBe('دوربین کوچک');
  });

  it('limits the length', () => {
    expect(normalizeSearchQuery('a'.repeat(500))).toHaveLength(
      SEARCH_MAX_LENGTH,
    );
  });

  it.each([undefined, null, 42, ['x'], '   '])(
    'treats %p as no search',
    (value) => {
      expect(normalizeSearchQuery(value)).toBe('');
    },
  );
});
