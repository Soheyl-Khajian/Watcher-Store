// frontend/src/lib/api/nestjs.ts
//
// The browser's calls for the logged-in customer. They go to the
// storefront's own /api routes, which hold the session cookie and talk to
// Nest; the browser never sees a token.

import type { AuthUser, Cart, Order, OrderStatus } from '@/types';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from '../csrf';
import { useAuthStore } from '../store/auth';
import { localizeHref, splitLocale } from '@/i18n/paths';
import { loginPathFor } from '../utils/safe-next';
import type { ShippingPayload } from '../validation/shipping';

const UNAVAILABLE_MESSAGE =
  'ارتباط با فروشگاه برقرار نشد. لطفاً کمی بعد دوباره تلاش کنید.';

// The session ended while the customer was doing something (it expired, or
// they logged out in another tab): forget it and ask them to log in again,
// coming back here afterwards.
function sessionEnded(): void {
  useAuthStore.getState().clear();
  if (typeof window === 'undefined') {
    return;
  }
  const { locale, path } = splitLocale(window.location.pathname);
  if (path === '/login') {
    return;
  }
  // A full page load on purpose: this runs outside React (no router at
  // hand), and a fresh page leaves no state from the ended session behind.
  const login = loginPathFor(path + window.location.search);
  window.location.assign(locale ? localizeHref(locale, login) : login);
}

interface ApiResult {
  ok: boolean;
  status: number | null;
  body: unknown;
}

// One call to a storefront /api route. Never throws.
async function api(
  path: string,
  init: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {},
  { redirectOnSignedOut = true } = {},
): Promise<ApiResult> {
  const method = init.method ?? 'GET';
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...init.headers,
  };
  if (method !== 'GET') {
    headers[CSRF_HEADER] = CSRF_HEADER_VALUE;
  }
  if (init.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(`/api/${path}`, {
      method,
      headers,
      credentials: 'same-origin',
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    let body: unknown = null;
    if (response.status !== 204) {
      try {
        body = await response.json();
      } catch {
        body = null;
      }
    }
    if (response.status === 401 && redirectOnSignedOut) {
      sessionEnded();
    }
    return { ok: response.ok, status: response.status, body };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Request to /api/${path} failed:`, error);
    return { ok: false, status: null, body: null };
  }
}

// The Persian message an API error carries, if any.
function messageOf(result: ApiResult): string | null {
  const message = (result.body as { message?: unknown } | null)?.message;
  return typeof message === 'string' ? message : null;
}

const segment = (value: string | number) => encodeURIComponent(String(value));

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export type AuthResult =
  { ok: true; user: AuthUser } | { ok: false; message: string };

export async function loginUser(credentials: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  const result = await api(
    'auth/login',
    { method: 'POST', body: credentials },
    { redirectOnSignedOut: false },
  );
  const user = (result.body as { user?: AuthUser } | null)?.user;
  if (result.ok && user) {
    return { ok: true, user };
  }
  return { ok: false, message: messageOf(result) ?? UNAVAILABLE_MESSAGE };
}

export async function registerUser(credentials: {
  email: string;
  password: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const result = await api(
    'auth/register',
    { method: 'POST', body: credentials },
    { redirectOnSignedOut: false },
  );
  return result.ok
    ? { ok: true }
    : { ok: false, message: messageOf(result) ?? UNAVAILABLE_MESSAGE };
}

export async function logoutUser(): Promise<void> {
  await api('auth/logout', { method: 'POST' }, { redirectOnSignedOut: false });
}

// The logged-in customer, null when signed out, undefined when it could
// not be checked (the storefront server is unreachable).
export async function fetchCurrentUser(): Promise<AuthUser | null | undefined> {
  const result = await api('auth/me', {}, { redirectOnSignedOut: false });
  if (result.status === 401) {
    return null;
  }
  const user = (result.body as { user?: AuthUser } | null)?.user;
  return result.ok && user ? user : undefined;
}

// Loads the session once per page load (later calls share the answer).
let sessionCheck: Promise<void> | null = null;

export function loadSession(): Promise<void> {
  // Earlier versions kept the token in localStorage; remove what is left.
  try {
    window.localStorage.removeItem('auth-storage');
  } catch {
    // Storage may be unavailable (private mode); nothing to clean then.
  }
  sessionCheck ??= fetchCurrentUser().then(async (user) => {
    if (user === undefined) {
      // Try again on the next call.
      sessionCheck = null;
      return;
    }
    useAuthStore.getState().setUser(user);
    if (user) {
      await syncCart();
    }
  });
  return sessionCheck;
}

// Loads the customer's cart from the server into the page's state.
export async function syncCart(): Promise<void> {
  const cart = await fetchCart();
  if (cart) {
    useAuthStore.getState().setCart(cart);
  }
}

// ---------------------------------------------------------------------------
// Cart
// ---------------------------------------------------------------------------

// The cart as the server returns it (shape defined by Nest's cart API).
const cartOf = (result: ApiResult): Cart | null =>
  result.ok && result.body ? (result.body as Cart) : null;

export async function fetchCart(): Promise<Cart | null> {
  return cartOf(await api('nest/cart'));
}

export async function addToCart(
  productId: string,
  quantity: number,
): Promise<Cart | null> {
  return cartOf(
    await api('nest/cart', {
      method: 'POST',
      body: { productId: String(productId), quantity: Number(quantity) },
    }),
  );
}

// Sets how many of a product are in the cart. The server checks stock and
// answers with a message for the customer when there is not enough.
export async function setCartQuantity(
  productId: string,
  quantity: number,
): Promise<{ ok: true; cart: Cart } | { ok: false; message: string }> {
  const result = await api(`nest/cart/${segment(productId)}`, {
    method: 'PATCH',
    body: { quantity },
  });
  const cart = cartOf(result);
  return cart
    ? { ok: true, cart }
    : {
        ok: false,
        message: messageOf(result) ?? 'تغییر تعداد ممکن نشد. دوباره تلاش کنید.',
      };
}

// The updated cart is returned.
export async function removeFromCart(productId: string): Promise<Cart | null> {
  return cartOf(
    await api(`nest/cart/${segment(productId)}`, { method: 'DELETE' }),
  );
}

// ---------------------------------------------------------------------------
// Orders and payment
// ---------------------------------------------------------------------------

export type CreateOrderResult =
  | { ok: true; order: { id: number } }
  | { ok: false; status: number | null; message: string | null };

export async function createOrder(
  checkoutKey: string,
  shipping: ShippingPayload,
): Promise<CreateOrderResult> {
  const result = await api('nest/orders', {
    method: 'POST',
    body: { shipping },
    headers: { 'Idempotency-Key': checkoutKey },
  });

  if (!result.ok) {
    // Only conflicts (for example insufficient stock) carry a message that
    // is written for customers. Validation messages are not shown.
    return {
      ok: false,
      status: result.status,
      message: result.status === 409 ? messageOf(result) : null,
    };
  }

  const id = (result.body as { id?: unknown } | null)?.id;
  return typeof id === 'number'
    ? { ok: true, order: { id } }
    : { ok: false, status: null, message: null };
}

// The gateway page to send the customer to, or null.
export async function initiatePayment(
  orderId: number,
): Promise<{ paymentUrl: string } | null> {
  const result = await api('nest/payment/initiate', {
    method: 'POST',
    body: { orderId },
  });
  const paymentUrl = (result.body as { paymentUrl?: unknown } | null)
    ?.paymentUrl;
  return result.ok && typeof paymentUrl === 'string' ? { paymentUrl } : null;
}

export type { OrderStatus } from '@/types';

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
): Promise<OrderStatus | null> {
  const result = await api(`nest/orders/${segment(orderId)}`);
  const status = (result.body as { status?: unknown } | null)?.status;
  return result.ok &&
    typeof status === 'string' &&
    ORDER_STATUSES.includes(status)
    ? (status as OrderStatus)
    : null;
}

export interface OrdersPage {
  items: Order[];
  page: number;
  totalPages: number;
}

// One page of the customer's orders, newest first.
export async function fetchOrdersPage(
  page = 1,
  limit = 10,
): Promise<OrdersPage | null> {
  const result = await api(`nest/orders?page=${page}&limit=${limit}`);
  const body = result.body as Partial<OrdersPage> | null;
  if (!result.ok || !body || !Array.isArray(body.items)) {
    return null;
  }
  return {
    items: body.items,
    page: typeof body.page === 'number' ? body.page : page,
    totalPages: typeof body.totalPages === 'number' ? body.totalPages : 1,
  };
}

// Cancels one of the customer's unpaid orders.
export async function cancelOrder(
  orderId: number,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const result = await api(`nest/orders/${segment(orderId)}/cancel`, {
    method: 'POST',
  });
  return result.ok
    ? { ok: true }
    : { ok: false, message: messageOf(result) ?? UNAVAILABLE_MESSAGE };
}
