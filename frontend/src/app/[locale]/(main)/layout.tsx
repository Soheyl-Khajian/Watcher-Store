// frontend/src/app/[locale]/(main)/layout.tsx
import { getT } from '@/i18n/server';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

// Every storefront page shows catalogue content, so pages are rendered per
// request rather than once at build time (when Payload may not be running,
// which used to bake empty pages into the image). Payload answers are still
// cached briefly in the data cache (lib/api/payload.ts).
export const dynamic = 'force-dynamic';

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const t = await getT();
  return (
    <div className="flex min-h-screen flex-col">
      {/* First stop for the keyboard: past the header to the content. */}
      <a
        href="#main"
        className="bg-background focus:ring-ring sr-only z-[60] rounded-md px-4 py-2 font-medium focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:ring-2"
      >
        {t('common.skipToContent')}
      </a>
      <Header />
      <main id="main" tabIndex={-1} className="flex-grow outline-none">
        {children}
      </main>
      <Footer />
    </div>
  );
}
