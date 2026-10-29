// backend/nest-api/src/common/text/normalize.ts

const PERSIAN_ZERO = 0x06f0;
const ARABIC_INDIC_ZERO = 0x0660;

// Converts Persian (۰-۹) and Arabic-Indic (٠-٩) digits to ASCII digits.
export function normalizeDigits(value: string): string {
  return value.replace(/[\u06F0-\u06F9\u0660-\u0669]/g, (char) => {
    const code = char.charCodeAt(0);

    return String(
      code >= PERSIAN_ZERO ? code - PERSIAN_ZERO : code - ARABIC_INDIC_ZERO,
    );
  });
}
