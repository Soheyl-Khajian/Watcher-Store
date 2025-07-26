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
  image?: Media; // <-- پراپرتی تصویر
  parent?: Category;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  slug?: string;
  thumbnail?: Media; // <-- پراپرتی تصویر شاخص
  categories?: Category[];
  // ... سایر فیلدهایی که در Payload تعریف کرده‌اید
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
