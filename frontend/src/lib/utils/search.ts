// frontend/src/lib/utils/search.ts
//
// Cleans up what a shopper typed into the product search.

export const SEARCH_MAX_LENGTH = 100;

// Arabic keyboard layouts type ي and ك, which look like the Persian ی and
// ک but are different characters, so a search would miss product names.
const ARABIC_TO_PERSIAN: Record<string, string> = {
  ي: 'ی',
  ى: 'ی',
  ك: 'ک',
};

// The query to search for, or '' when there is nothing to search.
export function normalizeSearchQuery(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value
    .replace(/[يىك]/g, (char) => ARABIC_TO_PERSIAN[char] ?? char)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, SEARCH_MAX_LENGTH);
}
