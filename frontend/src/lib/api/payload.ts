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
