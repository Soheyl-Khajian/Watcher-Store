// lib/api/payload.ts

import { unstable_noStore as noStore } from 'next/cache';

const PAYLOAD_API_URL = 'http://localhost:3000/api';

// یک تابع کمکی برای ارسال درخواست‌ها
async function fetchPayloadAPI(endpoint: string, options: RequestInit = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const url = `${PAYLOAD_API_URL}${endpoint}`;

  try {
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      console.error(`Payload API Error: ${res.status} ${res.statusText}`);
      return null;
    }
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch from Payload API:', error);
    return null;
  }
}

// تابع برای دریافت تمام محصولات
export async function fetchProducts() {
  noStore(); // از کش شدن این درخواست جلوگیری می‌کند تا همیشه داده‌ها تازه باشند
  const data = await fetchPayloadAPI('/products?limit=4');
  return data?.docs || [];
}

// تابع برای دریافت تمام دسته‌بندی‌ها
export async function fetchCategories() {
  noStore();
  const data = await fetchPayloadAPI('/categories?limit=4');
  return data?.docs || [];
}

// تابع برای دریافت یک محصول خاص بر اساس اسلاگ
export async function fetchProductBySlug(slug: string) {
  noStore();
  const data = await fetchPayloadAPI(
    `/products?where[slug][equals]=${slug}&depth=2`,
  );
  // ای پی آی یک آرایه برمی‌گرداند، پس ما آیتم اول آن را انتخاب می‌کنیم
  return data?.docs?.[0] || null;
}

//  یک دسته‌بندی خاص را بر اساس اسلاگ پیدا می‌کند
export async function fetchCategoryBySlug(slug: string) {
  noStore();
  const data = await fetchPayloadAPI(
    `/categories?where[slug][equals]=${slug}&limit=1`,
  );
  return data?.docs?.[0] || null;
}

// محصولات را بر اساس شناسه دسته‌بندی فیلتر می‌کند
export async function fetchProductsByCategoryId(categoryId: string) {
  noStore();
  // از where[categories][in] برای فیلتر بر اساس ID استفاده می‌کنیم
  const data = await fetchPayloadAPI(
    `/products?where[categories][in]=${categoryId}&depth=1`,
  );
  return data?.docs || [];
}

// تابع جدید برای ثبت‌نام کاربر
export async function registerUser(credentials: {
  email: string;
  password: string;
}) {
  const data = await fetchPayloadAPI('/users', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
  return data;
}

// تابع جدید برای دریافت اطلاعات چندین محصول بر اساس آیدی
export async function fetchProductsByIds(ids: string[]) {
  noStore();
  const data = await fetchPayloadAPI(
    `/products?where[id][in]=${ids.join(',')}&depth=1`,
  );
  return data?.docs || [];
}
