// مسیر فایل: src/app/(main)/layout.tsx
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* هدر سایت در اینجا قرار می گیرد */}
      <Header />
      {/* محتوای اصلی هر صفحه در اینجا رندر می شود */}
      <main className="flex-grow">{children}</main>
      <Footer /> {/* <-- اضافه کردن فوتر به چیدمان */}
    </div>
  );
}
