// frontend/types/index.ts

export interface Media {
  id: string | number;
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
  id: string | number; // برای هماهنگی، به string | number تغییر کرد
  name: string;
  slug?: string;
  icon?: string; // <-- فیلد جدید برای نام آیکون اضافه شد
  image?: Media;
  parent?: Category | string | number; // parent می‌تواند آبجکت کامل یا فقط ID باشد
  children?: Category[];
}

export interface Product {
  id: string | number;
  name: string;
  sku: string;
  price: number; // این فیلد قیمت اصلی است
  stock?: number;
  slug?: string;
  status?: 'published' | 'draft';
  categories?: (Category | string | number)[];

  // فیلدهای جدید برای فروش ویژه
  salePrice?: number | null;
  isOnSale?: boolean;

  gallery:
    | {
        image: Media | number;
        id?: string | null;
      }[]
    | null;

  specifications:
    | {
        specName: string;
        specValue: string;
        id?: string | null;
      }[]
    | null;

  features:
    | {
        feature: string;
        id?: string | null;
      }[]
    | null;

  description: any; // برای نقد و بررسی کامل (Rich Text)
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
  author: string;
  authorName?: string;
  publishedDate: string;
  thumbnail: Media;
  content: any;
  status: 'draft' | 'published';
  excerpt?: string;
}
