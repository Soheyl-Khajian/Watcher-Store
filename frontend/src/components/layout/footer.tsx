// مسیر فایل: src/components/layout/footer.tsx

import Link from 'next/link';
import { Instagram, Linkedin, Send } from 'lucide-react';
import { fetchFooter } from '@/lib/api/payload';
import type { Footer as FooterType } from '@payload-types';

const iconMap = {
  Instagram: <Instagram className="h-6 w-6" />,
  Linkedin: <Linkedin className="h-6 w-6" />,
  Telegram: <Send className="h-6 w-6" />,
};

export async function Footer() {
  const footerData: FooterType | null = await fetchFooter();
  const { description, linkColumns, socialLinks } = footerData || {};

  return (
    <footer className="bg-muted/50">
      <div className="container mx-auto py-12 px-2">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-1">
            <h4 className="mb-4 text-lg font-bold">فروشگاه واچر</h4>
            <p className="text-sm text-muted-foreground">{description}</p>
            <div className="mt-6 flex space-x-4 space-x-reverse">
              {/* ۱. اضافه کردن ?? [] برای socialLinks */}
              {(socialLinks ?? []).map((link) => (
                <Link
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                >
                  {iconMap[link.platform as keyof typeof iconMap]}
                  <span className="sr-only">{link.platform}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* ۲. اضافه کردن ?? [] برای linkColumns */}
          {(linkColumns ?? []).map((column) => (
            <div key={column.id}>
              <h4 className="mb-4 text-lg font-bold">{column.title}</h4>
              <ul className="space-y-3">
                {/* ۳. اضافه کردن ?? [] برای ستون لینک‌های داخلی */}
                {(column.links ?? []).map((link) => (
                  <li key={link.id}>
                    <Link
                      href={link.url}
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

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
