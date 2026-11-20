import { describe, expect, it } from 'vitest';
import {
  EMPTY_SHIPPING_FORM,
  normalizeDigits,
  type ShippingFormValues,
  validateShipping,
} from './shipping';

const valid: ShippingFormValues = {
  ...EMPTY_SHIPPING_FORM,
  recipientName: 'علی رضایی',
  phone: '09123456789',
  province: 'تهران',
  city: 'تهران',
  address: 'خیابان آزادی، کوچه ۱۲، پلاک ۴',
  postalCode: '1234567890',
};

function errorsFor(values: Partial<ShippingFormValues>) {
  const result = validateShipping({ ...valid, ...values });
  return result.ok ? {} : result.errors;
}

describe('normalizeDigits', () => {
  it('converts Persian and Arabic-Indic digits to ASCII', () => {
    expect(normalizeDigits('۰۹۱۲۳۴۵۶۷۸۹')).toBe('09123456789');
    expect(normalizeDigits('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
  });

  it('leaves other characters alone', () => {
    expect(normalizeDigits('پلاک 12-۳')).toBe('پلاک 12-3');
  });
});

describe('validateShipping', () => {
  it('accepts a complete address and returns a trimmed payload', () => {
    const result = validateShipping({
      ...valid,
      recipientName: '  علی رضایی  ',
    });

    expect(result).toEqual({
      ok: true,
      payload: {
        recipientName: 'علی رضایی',
        phone: '09123456789',
        province: 'تهران',
        city: 'تهران',
        address: 'خیابان آزادی، کوچه ۱۲، پلاک ۴',
        postalCode: '1234567890',
      },
    });
  });

  it('normalizes Persian digits and separators in phone and postal code', () => {
    const result = validateShipping({
      ...valid,
      phone: '۰۹۱۲ ۳۴۵ ۶۷۸۹',
      postalCode: '۱۲۳۴۵-۶۷۸۹۰',
    });

    expect(result.ok && result.payload).toMatchObject({
      phone: '09123456789',
      postalCode: '1234567890',
    });
  });

  it('includes optional fields only when they are filled in', () => {
    const result = validateShipping({
      ...valid,
      unit: '۳',
      floor: '',
      deliveryNotes: '  زنگ دوم  ',
    });

    expect(result.ok && result.payload).toMatchObject({
      unit: '3',
      deliveryNotes: 'زنگ دوم',
    });
    expect(result.ok && result.payload).not.toHaveProperty('floor');
  });

  it('reports every missing required field', () => {
    const result = validateShipping(EMPTY_SHIPPING_FORM);

    expect(result.ok).toBe(false);
    expect(Object.keys(result.ok ? {} : result.errors).sort()).toEqual([
      'address',
      'city',
      'phone',
      'postalCode',
      'province',
      'recipientName',
    ]);
  });

  it.each(['0912345678', '091234567890', '08123456789', '+989123456789'])(
    'rejects the phone number %s',
    (phone) => {
      expect(errorsFor({ phone })).toHaveProperty('phone');
    },
  );

  it.each(['123456789', '12345678901', '12345abcde'])(
    'rejects the postal code %s',
    (postalCode) => {
      expect(errorsFor({ postalCode })).toHaveProperty('postalCode');
    },
  );

  it('enforces length limits', () => {
    expect(errorsFor({ recipientName: 'ع' })).toHaveProperty('recipientName');
    expect(errorsFor({ address: 'کوتاه' })).toHaveProperty('address');
    expect(errorsFor({ unit: 'x'.repeat(21) })).toHaveProperty('unit');
    expect(errorsFor({ deliveryNotes: 'x'.repeat(501) })).toHaveProperty(
      'deliveryNotes',
    );
  });
});
