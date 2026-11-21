// frontend/src/lib/api/nestjs.ts

import type { ShippingPayload } from '../validation/shipping';
import { env } from '../env';

const NESTJS_API_URL = env.NEXT_PUBLIC_NESTJS_API_URL;

export async function loginUser(credentials: {
  email: string;
  password: string;
}) {
  try {
    const res = await fetch(`${NESTJS_API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return data; // This object should contain access_token
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to fetch from NestJS API:', error);
    return null;
  }
}

export async function fetchUserProfile(token: string) {
  try {
    const res = await fetch(`${NESTJS_API_URL}/auth/profile`, {
      headers: {
        'Content-Type': 'application/json',
        // Send the token in the Authorization header
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return data;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching user profile:', error);
    return null;
  }
}

export async function fetchCart(token: string) {
  try {
    const res = await fetch(`${NESTJS_API_URL}/cart`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to fetch cart:', error);
    return null;
  }
}

export async function addToCart(
  productId: string,
  quantity: number,
  token: string,
) {
  try {
    const res = await fetch(`${NESTJS_API_URL}/cart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        productId: String(productId), // Ensure it's a string
        quantity: Number(quantity), // Ensure it's a number
      }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to add to cart:', error);
    return null;
  }
}

export async function removeFromCart(productId: string, token: string) {
  try {
    const res = await fetch(`${NESTJS_API_URL}/cart/${productId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return null;
    return await res.json(); // The updated cart is returned
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to remove from cart:', error);
    return null;
  }
}

export type CreateOrderResult =
  | { ok: true; order: { id: number } }
  | { ok: false; status: number | null; message: string | null };

export async function createOrder(
  token: string,
  checkoutKey: string,
  shipping: ShippingPayload,
): Promise<CreateOrderResult> {
  try {
    const res = await fetch(`${NESTJS_API_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'Idempotency-Key': checkoutKey,
      },
      body: JSON.stringify({ shipping }),
    });

    if (!res.ok) {
      // Only conflicts (for example insufficient stock) carry a message that
      // is written for customers. Validation messages are not shown.
      let message: string | null = null;

      if (res.status === 409) {
        try {
          const body: unknown = await res.json();
          const candidate = (body as { message?: unknown } | null)?.message;
          if (typeof candidate === 'string') {
            message = candidate;
          }
        } catch {
          // Ignore unreadable error bodies.
        }
      }

      return { ok: false, status: res.status, message };
    }

    const order = (await res.json()) as { id?: unknown };

    if (typeof order.id !== 'number') {
      return { ok: false, status: null, message: null };
    }

    return { ok: true, order: { id: order.id } };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to create order:', error);
    return { ok: false, status: null, message: null };
  }
}

export async function initiatePayment(orderId: number, token: string) {
  try {
    const res = await fetch(`${NESTJS_API_URL}/payment/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ orderId }),
    });
    if (!res.ok) return null;
    return await res.json(); // It should contain paymentUrl
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to initiate payment:', error);
    return null;
  }
}

export type OrderStatus =
  'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled';

const ORDER_STATUSES: readonly string[] = [
  'pending',
  'processing',
  'shipped',
  'completed',
  'cancelled',
];

// The status of one of the customer's own orders, as the server records it.
// After a payment this is the only trustworthy answer: the server verified
// the payment with the gateway before the customer was sent back here.
export async function fetchOrderStatus(
  orderId: string,
  token: string,
): Promise<OrderStatus | null> {
  try {
    const res = await fetch(
      `${NESTJS_API_URL}/orders/${encodeURIComponent(orderId)}`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    );
    if (!res.ok) return null;
    const order: unknown = await res.json();
    const status =
      typeof order === 'object' && order !== null && 'status' in order
        ? order.status
        : null;
    return typeof status === 'string' && ORDER_STATUSES.includes(status)
      ? (status as OrderStatus)
      : null;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to fetch order status:', error);
    return null;
  }
}

// The most recent orders (the API pages order history; the profile page
// shows the latest 50 for now).
export async function fetchUserOrders(token: string) {
  try {
    const res = await fetch(`${NESTJS_API_URL}/orders?limit=50`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return null;
    const page = await res.json();
    return Array.isArray(page?.items) ? page.items : null;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to fetch user orders:', error);
    return null;
  }
}
