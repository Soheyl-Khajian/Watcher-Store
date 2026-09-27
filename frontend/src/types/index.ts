// frontend/src/types/index.ts

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
  id: string | number;
  name: string;
  slug?: string;
  icon?: string;
  image?: Media;
  parent?: Category | string | number;
  children?: Category[];
}

export interface Product {
  id: string | number;
  name: string;
  sku: string;
  price: number; // main price field
  stock?: number;
  slug?: string;
  status?: 'published' | 'draft';
  categories?: (Category | string | number)[];

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

  description: any;
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
  status: string;
  createdAt: string;
  items: OrderItem[];
}

export interface Post {
  id: string;
  title: string;
  slug: string;
  authorName?: string | null;
  publishedDate: string;
  thumbnail: Media;
  content: any;
  status: 'draft' | 'published';
  excerpt?: string;
}
