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
