// مسیر فایل: src/app/(main)/layout.tsx
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

// Every storefront page shows catalogue content, so pages are rendered per
// request rather than once at build time (when Payload may not be running,
// which used to bake empty pages into the image). Payload answers are still
// cached briefly in the data cache (lib/api/payload.ts).
export const dynamic = 'force-dynamic';

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-grow">{children}</main>
      <Footer />
    </div>
  );
}
