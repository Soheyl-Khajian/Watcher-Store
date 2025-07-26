// lib/api/nestjs.ts

const NESTJS_API_URL = 'http://localhost:3001';

// تابع برای ورود کاربر
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
      console.error(`NestJS API Error: ${res.status} ${res.statusText}`);
      return null;
    }

    const data = await res.json();
    return data; // این آبجکت باید شامل access_token باشد
  } catch (error) {
    console.error('Failed to fetch from NestJS API:', error);
    return null;
  }
}

// تابع برای دریافت اطلاعات پروفایل کاربر
export async function fetchUserProfile(token: string) {
  try {
    const res = await fetch(`${NESTJS_API_URL}/auth/profile`, {
      headers: {
        'Content-Type': 'application/json',
        // توکن را در هدر Authorization ارسال می‌کنیم
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      console.error('Failed to fetch user profile');
      return null;
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

// تابع برای دریافت سبد خرید کاربر
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
    console.error('Failed to fetch cart:', error);
    return null;
  }
}

// تابع برای افزودن محصول به سبد خرید
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
        productId: String(productId), // مطمئن می‌شویم رشته است
        quantity: Number(quantity), // مطمئن می‌شویم عدد است
      }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('Failed to add to cart:', error);
    return null;
  }
}

// تابع برای حذف یک محصول از سبد خرید
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
    return await res.json(); // سبد خرید به‌روز شده را برمی‌گرداند
  } catch (error) {
    console.error('Failed to remove from cart:', error);
    return null;
  }
}

// تابع برای ثبت نهایی سفارش
export async function createOrder(token: string) {
  try {
    const res = await fetch(`${NESTJS_API_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('Failed to create order:', error);
    return null;
  }
}

// تابع برای شروع فرآیند پرداخت
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
    return await res.json(); // باید حاوی paymentUrl باشد
  } catch (error) {
    console.error('Failed to initiate payment:', error);
    return null;
  }
}

// تابع برای تأیید نهایی پرداخت
export async function verifyPayment(
  orderId: string,
  status: string,
  token: string,
) {
  try {
    const res = await fetch(
      `${NESTJS_API_URL}/payment/verify?orderId=${orderId}&status=${status}`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    );
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('Failed to verify payment:', error);
    return null;
  }
}

// تابع برای دریافت تاریخچه سفارشات کاربر
export async function fetchUserOrders(token: string) {
  try {
    const res = await fetch(`${NESTJS_API_URL}/orders`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('Failed to fetch user orders:', error);
    return null;
  }
}
