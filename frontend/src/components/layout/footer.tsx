// مسیر فایل: src/components/layout/footer.tsx

import Link from 'next/link';
import { Instagram, Linkedin, Send } from 'lucide-react';

export function Footer() {
  return (
    // ۱. تگ footer برای سئوی بهتر
    <footer className="bg-muted/50">
      <div className="container mx-auto py-12 px-2">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* ستون اول: درباره فروشگاه و شبکه‌های اجتماعی */}
          <div className="md:col-span-1">
            <h4 className="mb-4 text-lg font-bold">فروشگاه واچر</h4>
            <p className="text-sm text-muted-foreground">
              تامین‌کننده پیشرو در زمینه تجهیزات امنیتی و هوشمندسازی ساختمان با
              هدف ارائه راهکارهای نوین برای آسایش و امنیت شما.
            </p>
            <div className="mt-6 flex space-x-4 space-x-reverse">
              <Link
                href="#"
                className="text-muted-foreground hover:text-foreground"
              >
                <Instagram className="h-6 w-6" />
              </Link>
              <Link
                href="#"
                className="text-muted-foreground hover:text-foreground"
              >
                <Linkedin className="h-6 w-6" />
              </Link>
              <Link
                href="#"
                className="text-muted-foreground hover:text-foreground"
              >
                <Send className="h-6 w-6 mr-4" />
              </Link>
            </div>
          </div>

          {/* ستون دوم: لینک‌های دسترسی سریع */}
          <div>
            <h4 className="mb-4 text-lg font-bold">دسترسی سریع</h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/shop"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  فروشگاه
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  وبلاگ
                </Link>
              </li>
              <li>
                <Link
                  href="/about-us"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  درباره ما
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  سوالات متداول
                </Link>
              </li>
            </ul>
          </div>

          {/* ستون سوم: دسته‌بندی محصولات */}
          <div>
            <h4 className="mb-4 text-lg font-bold">دسته‌بندی‌ها</h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/category/cctv"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  دوربین مداربسته
                </Link>
              </li>
              <li>
                <Link
                  href="/category/smart-home"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  خانه هوشمند
                </Link>
              </li>
              <li>
                <Link
                  href="/category/solar"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  پنل خورشیدی
                </Link>
              </li>
              <li>
                <Link
                  href="/category/access-control"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  کنترل تردد
                </Link>
              </li>
            </ul>
          </div>

          {/* ستون چهارم: پشتیبانی و قوانین */}
          <div>
            <h4 className="mb-4 text-lg font-bold">پشتیبانی</h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/contact-us"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  تماس با ما
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  قوانین و مقررات
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy-policy"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  حریم خصوصی
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* بخش کپی رایت در پایین فوتر */}
        <div className="mt-10 border-t pt-6 text-center text-sm text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} فروشگاه امنیتی واچر. تمامی حقوق
            محفوظ است.
          </p>
        </div>
      </div>
    </footer>
  );
}
