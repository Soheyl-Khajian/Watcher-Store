// frontend/types/index.ts

export interface Media {
  id: string;
  alt: string;
  createdAt: string;
  updatedAt: string;
  url?: string;
  thumbnailURL?: string;
  filename?: string;
  mimeType?: string;
  filesize?: number;
  width?: number;
  height?: number;
  sizes?: {
    thumbnail?: {
      url?: string;
      width?: number;
      height?: number;
      mimeType?: string;
      filesize?: number;
      filename?: string;
    };
    card?: {
      url?: string;
      width?: number;
      height?: number;
      mimeType?: string;
      filesize?: number;
      filename?: string;
    };
  };
}

export interface Category {
  id: string;
  name: string;
  slug?: string;
  image?: Media;
  parent?: Category | string; // parent می‌تواند آبجکت کامل یا فقط ID باشد
  children?: Category[];
}

export interface Product {
  id: string;
  name: string;
  price: number;
  slug?: string;
  thumbnail?: Media;
  categories?: Category[];
}

export interface CartItem {
  id: number;
  productId: string;
  quantity: number;
}

export interface Cart {
  id: number;
  userId: number;
  items: CartItem[];
}

export interface OrderItem {
  id: number;
  productId: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: number;
  userId: number;
  total: number;
  status: string; // یا OrderStatus enum اگر آن را تعریف کرده‌اید
  createdAt: string; // تاریخ به صورت رشته‌ای از ای پی آی می‌آید
  items: OrderItem[];
}

export interface Post {
  id: string;
  title: string;
  slug: string;
  // author حالا فقط یک شناسه است
  author: string;
  // فیلد جدید برای نمایش نام نویسنده
  authorName?: string;
  publishedDate: string; // تاریخ به صورت رشته‌ای از API می‌آید
  thumbnail: Media; // تصویر شاخص از نوع Media است
  content: any; // محتوای richText ساختار پیچیده‌ای دارد، فعلاً آن را any در نظر می‌گیریم
  status: 'draft' | 'published';
  excerpt?: string; // فیلد جدید برای خلاصه مطلب
}
