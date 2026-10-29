// frontend/src/lib/validation/shipping.ts

// Mirrors the server-side rules in the Nest ShippingDetailsDto. The server is
// authoritative; this only gives users immediate feedback.

export interface ShippingFormValues {
  recipientName: string;
  phone: string;
  province: string;
  city: string;
  address: string;
  postalCode: string;
  unit: string;
  floor: string;
  deliveryNotes: string;
}

export type ShippingField = keyof ShippingFormValues;
export type ShippingErrors = Partial<Record<ShippingField, string>>;

export interface ShippingPayload {
  recipientName: string;
  phone: string;
  province: string;
  city: string;
  address: string;
  postalCode: string;
  unit?: string;
  floor?: string;
  deliveryNotes?: string;
}

export const EMPTY_SHIPPING_FORM: ShippingFormValues = {
  recipientName: '',
  phone: '',
  province: '',
  city: '',
  address: '',
  postalCode: '',
  unit: '',
  floor: '',
  deliveryNotes: '',
};

// Display order, used to focus the first invalid field.
export const SHIPPING_FIELD_ORDER: ShippingField[] = [
  'recipientName',
  'phone',
  'province',
  'city',
  'address',
  'postalCode',
  'unit',
  'floor',
  'deliveryNotes',
];

// Input maxLength attributes. Phone and postal code are looser than the server
// limits because separators are stripped before validation.
export const SHIPPING_MAX_LENGTH: Record<ShippingField, number> = {
  recipientName: 100,
  phone: 20,
  province: 50,
  city: 50,
  address: 500,
  postalCode: 15,
  unit: 20,
  floor: 20,
  deliveryNotes: 500,
};

// Converts Persian (۰-۹) and Arabic-Indic (٠-٩) digits to ASCII digits.
export function normalizeDigits(value: string): string {
  return value.replace(/[\u06F0-\u06F9\u0660-\u0669]/g, (char) => {
    const code = char.charCodeAt(0);
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
  });
}

const faNumber = (value: number) =>
  new Intl.NumberFormat('fa-IR').format(value);

function requiredText(
  value: string,
  label: string,
  min: number,
  max: number,
): string | undefined {
  if (value.length === 0) {
    return `${label} را وارد کنید.`;
  }
  if (value.length < min || value.length > max) {
    return `${label} باید بین ${faNumber(min)} تا ${faNumber(max)} نویسه باشد.`;
  }
  return undefined;
}

function optionalText(
  value: string,
  label: string,
  max: number,
): string | undefined {
  if (value.length > max) {
    return `${label} نباید بیشتر از ${faNumber(max)} نویسه باشد.`;
  }
  return undefined;
}

export type ShippingValidationResult =
  | { ok: true; payload: ShippingPayload }
  | { ok: false; errors: ShippingErrors };

export function validateShipping(
  values: ShippingFormValues,
): ShippingValidationResult {
  const recipientName = values.recipientName.trim();
  const province = values.province.trim();
  const city = values.city.trim();
  const address = values.address.trim();
  const phone = normalizeDigits(values.phone.trim()).replace(/[\s-]/g, '');
  const postalCode = normalizeDigits(values.postalCode.trim()).replace(
    /[\s-]/g,
    '',
  );
  const unit = normalizeDigits(values.unit.trim());
  const floor = normalizeDigits(values.floor.trim());
  const deliveryNotes = values.deliveryNotes.trim();

  const errors: ShippingErrors = {};

  errors.recipientName = requiredText(
    recipientName,
    'نام و نام خانوادگی گیرنده',
    2,
    100,
  );
  errors.province = requiredText(province, 'استان', 2, 50);
  errors.city = requiredText(city, 'شهر', 2, 50);
  errors.address = requiredText(address, 'نشانی', 10, 500);

  if (phone.length === 0) {
    errors.phone = 'شماره موبایل را وارد کنید.';
  } else if (!/^09\d{9}$/.test(phone)) {
    errors.phone = 'شماره موبایل معتبر نیست. نمونه: ۰۹۱۲۳۴۵۶۷۸۹';
  }

  if (postalCode.length === 0) {
    errors.postalCode = 'کد پستی را وارد کنید.';
  } else if (!/^\d{10}$/.test(postalCode)) {
    errors.postalCode = 'کد پستی باید ۱۰ رقم باشد.';
  }

  errors.unit = optionalText(unit, 'واحد', 20);
  errors.floor = optionalText(floor, 'طبقه', 20);
  errors.deliveryNotes = optionalText(deliveryNotes, 'توضیحات تحویل', 500);

  const cleaned = Object.fromEntries(
    Object.entries(errors).filter(([, message]) => message !== undefined),
  ) as ShippingErrors;

  if (Object.keys(cleaned).length > 0) {
    return { ok: false, errors: cleaned };
  }

  return {
    ok: true,
    payload: {
      recipientName,
      phone,
      province,
      city,
      address,
      postalCode,
      ...(unit ? { unit } : {}),
      ...(floor ? { floor } : {}),
      ...(deliveryNotes ? { deliveryNotes } : {}),
    },
  };
}
