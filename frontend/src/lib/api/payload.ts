// مسیر فایل: frontend/lib/api/payload.ts

import type { Category, Product } from '@/types';

const PAYLOAD_API_URL =
  process.env.PAYLOAD_API_URL || 'http://localhost:3000/api';

// ۱. تابع کمکی اصلی با منطق کشینگ متمرکز
async function fetchPayloadAPI(endpoint: string, options: RequestInit = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const url = `${PAYLOAD_API_URL}${endpoint}`;

  // ۲. برای درخواست‌های غیر از GET، کش را غیرفعال می‌کنیم
  const isPostRequest =
    options.method && options.method.toUpperCase() !== 'GET';

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      // ۳. تمام درخواست‌های GET به مدت ۱ ساعت (۳۶۰۰ ثانیه) کش می‌شوند
      next: isPostRequest ? undefined : { revalidate: 3600 },
    });
    if (!res.ok) {
      console.error(`Payload API Error: ${res.status} ${res.statusText}`);
      return null;
    }
    // برای درخواست‌هایی که ممکن است پاسخی نداشته باشند (مثل حذف)
    if (res.status === 204) return true;
    return res.json();
  } catch (error) {
    console.error('Failed to fetch from Payload API:', error);
    return null;
  }
}

// === توابع مربوط به محصولات ===

// برای اسلایدر صفحه اصلی، ۱۲ محصول می‌گیریم
export async function fetchProducts() {
  const data = await fetchPayloadAPI('/products?limit=12&depth=1');
  return data?.docs || [];
}

// فقط محصولات در فروش ویژه را برای اسلایدر صفحه اصلی برمی‌گرداند
export async function fetchFeaturedProducts() {
  const data = await fetchPayloadAPI(
    '/products?where[isOnSale][equals]=true&limit=12&depth=1',
  );
  return data?.docs || [];
}

// برای صفحه "همه محصولات" با قابلیت فیلتر و صفحه‌بندی
export async function fetchAllProducts(page = 1, limit = 15, onSale = false) {
  let query = `/products?page=${page}&limit=${limit}&depth=1`;
  if (onSale) {
    query += `&where[isOnSale][equals]=true`;
  }
  const data = await fetchPayloadAPI(query);
  return data;
}

export async function fetchProductBySlug(slug: string) {
  const data = await fetchPayloadAPI(
    `/products?where[slug][equals]=${slug}&depth=2`,
  );
  return data?.docs?.[0] || null;
}

export async function fetchProductsByIds(ids: (string | number)[]) {
  const data = await fetchPayloadAPI(
    `/products?where[id][in]=${ids.join(',')}&depth=1&limit=100`,
  );
  return data?.docs || [];
}

// === توابع مربوط به دسته‌بندی‌ها ===

export async function fetchCategories() {
  const data = await fetchPayloadAPI('/categories?limit=100');
  return data?.docs || [];
}

export async function fetchParentCategories() {
  const data = await fetchPayloadAPI(
    '/categories?limit=100&where[parent][exists]=false',
  );
  return data?.docs || [];
}

export async function fetchCategoryTree() {
  const data = await fetchPayloadAPI('/categories?limit=200&depth=1');
  const categories: Category[] = data?.docs || [];

  const categoryMap: Record<string, Category> = {};
  const categoryTree: Category[] = [];

  categories.forEach((category) => {
    categoryMap[String(category.id)] = { ...category, children: [] };
  });

  categories.forEach((category) => {
    const parentId =
      typeof category.parent === 'object'
        ? String(category.parent?.id)
        : String(category.parent);

    if (parentId && categoryMap[parentId]) {
      categoryMap[parentId].children?.push(categoryMap[String(category.id)]);
    } else {
      categoryTree.push(categoryMap[String(category.id)]);
    }
  });

  return categoryTree;
}

export async function fetchProductsAndCategoryBySlug(slug: string, page = 1) {
  const limit = 15;
  const data = await fetchPayloadAPI(
    `/products-by-category/${slug}?page=${page}&limit=${limit}`,
  );
  return data || { category: null, productsResult: { docs: [] } };
}

// === توابع مربوط به کاربران ===

export async function registerUser(credentials: {
  email: string;
  password: string;
}) {
  return fetchPayloadAPI('/users', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

// === توابع مربوط به محتوا (پست‌ها، صفحات، فوتر) ===

export async function fetchPosts() {
  const data = await fetchPayloadAPI('/posts?limit=10&depth=2');
  return data?.docs || [];
}

export async function fetchPostBySlug(slug: string) {
  const data = await fetchPayloadAPI(
    `/posts?where[slug][equals]=${slug}&depth=2`,
  );
  return data?.docs?.[0] || null;
}

export async function fetchFooter() {
  return fetchPayloadAPI('/globals/footer');
}

export async function fetchPageBySlug(slug: string) {
  const data = await fetchPayloadAPI(`/pages?where[slug][equals]=${slug}`);
  return data?.docs?.[0] || null;
}
