// frontend/src/lib/validation/shipping.ts

// Mirrors the server-side rules in the Nest ShippingDetailsDto. The server is
// authoritative; this only gives users immediate feedback, as messages
// worded in the page's language.

import type { MessageRef, Messages } from '@/i18n/messages';

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
export type ShippingErrors = Partial<Record<ShippingField, MessageRef>>;

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

type FieldName = keyof Messages['validation']['fields'];

function requiredText(
  value: string,
  field: FieldName,
  min: number,
  max: number,
): MessageRef | undefined {
  const label: MessageRef = { key: `validation.fields.${field}` };
  if (value.length === 0) {
    return { key: 'validation.required', values: { field: label } };
  }
  if (value.length < min || value.length > max) {
    return {
      key: 'validation.length',
      values: { field: label, min, max },
    };
  }
  return undefined;
}

function optionalText(
  value: string,
  field: FieldName,
  max: number,
): MessageRef | undefined {
  if (value.length > max) {
    return {
      key: 'validation.tooLong',
      values: { field: { key: `validation.fields.${field}` }, max },
    };
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

  errors.recipientName = requiredText(recipientName, 'recipientName', 2, 100);
  errors.province = requiredText(province, 'province', 2, 50);
  errors.city = requiredText(city, 'city', 2, 50);
  errors.address = requiredText(address, 'address', 10, 500);

  if (phone.length === 0) {
    errors.phone = { key: 'validation.phoneRequired' };
  } else if (!/^09\d{9}$/.test(phone)) {
    errors.phone = { key: 'validation.phoneInvalid' };
  }

  if (postalCode.length === 0) {
    errors.postalCode = { key: 'validation.postalCodeRequired' };
  } else if (!/^\d{10}$/.test(postalCode)) {
    errors.postalCode = { key: 'validation.postalCodeInvalid' };
  }

  errors.unit = optionalText(unit, 'unit', 20);
  errors.floor = optionalText(floor, 'floor', 20);
  errors.deliveryNotes = optionalText(deliveryNotes, 'deliveryNotes', 500);

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
