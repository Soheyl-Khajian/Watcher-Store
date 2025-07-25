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
