// lib/api/payload.ts

import { Category } from '@/types';
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

// تابع جدید برای دریافت فقط دسته‌بندی‌های اصلی (بدون والد)
export async function fetchParentCategories() {
  // از where[parent][exists]=false برای فیلتر کردن استفاده می‌کنیم
  const data = await fetchPayloadAPI(
    '/categories?limit=100&where[parent][exists]=false',
  );
  return data?.docs || [];
}

// تابع جدید برای دریافت دسته‌بندی‌ها به صورت درختی
export async function fetchCategoryTree() {
  // ۱. تمام دسته‌بندی‌ها را با عمق ۱ دریافت می‌کنیم تا اطلاعات والد موجود باشد
  const data = await fetchPayloadAPI('/categories?limit=200&depth=1');
  const categories: Category[] = data?.docs || [];

  // الگوریتم ساخت درخت
  const categoryMap: { [key: string]: Category } = {};
  const categoryTree: Category[] = [];

  // ۲. همه دسته‌بندی‌ها را در یک نقشه (map) برای دسترسی سریع قرار می‌دهیم
  // و برای هر کدام یک آرایه فرزند خالی ایجاد می‌کنیم
  categories.forEach((category) => {
    categoryMap[category.id] = { ...category, children: [] };
  });

  // ۳. روی لیست دوباره حلقه می‌زنیم تا هر دسته را به والد خودش متصل کنیم
  categories.forEach((category) => {
    // اگر دسته والد داشت و والد آن در نقشه ما بود
    const parentId =
      typeof category.parent === 'string'
        ? category.parent
        : category.parent?.id;
    if (parentId && categoryMap[parentId]) {
      // این دسته را به آرایه فرزندان والدش اضافه کن
      categoryMap[parentId].children?.push(categoryMap[category.id]);
    } else {
      // اگر والد نداشت، این یک شاخه اصلی است
      categoryTree.push(categoryMap[category.id]);
    }
  });

  return categoryTree;
}

// تابع جدید برای دریافت دسته‌بندی و تمام محصولات زیرمجموعه آن
export async function fetchProductsAndCategoryBySlug(slug: string) {
  const data = await fetchPayloadAPI(`/products-by-category/${slug}`);
  // اگر داده‌ای نبود، یک مقدار پیش‌فرض برمی‌گردانیم تا برنامه کرش نکند
  return data || { category: null, products: [] };
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
    `/products?where[categories][in]=${categoryId}&depth=1&limit=1000`,
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

// تابع برای دریافت لیست مقالات
export async function fetchPosts() {
  noStore(); // برای اینکه همیشه آخرین مقالات نمایش داده شوند، کش را غیرفعال می‌کنیم
  // با depth=2، اطلاعات کامل نویسنده و تصویر شاخص را هم دریافت می‌کنیم
  const data = await fetchPayloadAPI('/posts?limit=10&depth=2');
  return data?.docs || [];
}

// تابع برای دریافت یک مقاله خاص بر اساس اسلاگ
export async function fetchPostBySlug(slug: string) {
  noStore();
  const data = await fetchPayloadAPI(
    `/posts?where[slug][equals]=${slug}&depth=2`,
  );
  // ای پی آی همیشه یک آرایه برمی‌گرداند، پس ما آیتم اول آن را انتخاب می‌کنیم
  return data?.docs?.[0] || null;
}

// تابع برای دریافت اطلاعات فوتر
export async function fetchFooter() {
  // گلوبال‌ها از طریق مسیر /api/globals/:slug قابل دسترسی هستند
  const footerData = await fetchPayloadAPI('/globals/footer');
  return footerData;
}

//تابع برای دریافت یک صفحه
export async function fetchPageBySlug(slug: string) {
  const data = await fetchPayloadAPI(`/pages?where[slug][equals]=${slug}`);
  // API یک آرایه برمی‌گرداند، ما آیتم اول را انتخاب می‌کنیم
  return data?.docs?.[0] || null;
}
