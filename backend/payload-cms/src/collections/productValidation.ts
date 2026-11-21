// backend/payload-cms/src/collections/productValidation.ts
//
// Validation for product prices and stock. Prices are whole toman; checkout
// (nest-api) rejects anything else, so invalid values are stopped here when
// they are entered instead of failing at checkout.

// Keep in sync with MAX_TOMAN_AMOUNT in nest-api/src/common/money/toman.ts,
// the largest amount checkout can store.
export const MAX_PRICE = 99_999_999_999_999;

type Validation = true | string;

const isWholeNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value);

const faNumber = (value: number) =>
  new Intl.NumberFormat('fa-IR').format(value);

export function validatePrice(value: unknown): Validation {
  if (value === null || value === undefined) {
    return 'قیمت را وارد کنید.';
  }
  if (!isWholeNumber(value) || value < 1 || value > MAX_PRICE) {
    return `قیمت باید عددی صحیح بین ۱ تا ${faNumber(MAX_PRICE)} تومان باشد.`;
  }
  return true;
}

export function validateSalePrice(
  value: unknown,
  sibling: { price?: unknown; isOnSale?: unknown },
): Validation {
  if (value === null || value === undefined) {
    return sibling.isOnSale === true
      ? 'برای محصولی که در فروش ویژه است، قیمت فروش ویژه را وارد کنید.'
      : true;
  }
  if (!isWholeNumber(value) || value < 1) {
    return 'قیمت فروش ویژه باید عددی صحیح و بزرگتر از صفر باشد.';
  }
  if (isWholeNumber(sibling.price) && value >= sibling.price) {
    return 'قیمت فروش ویژه باید کمتر از قیمت اصلی باشد.';
  }
  return true;
}

export function validateStock(value: unknown): Validation {
  if (value === null || value === undefined) {
    return true;
  }
  if (!isWholeNumber(value) || value < 0) {
    return 'موجودی باید عددی صحیح و صفر یا بیشتر باشد.';
  }
  return true;
}
