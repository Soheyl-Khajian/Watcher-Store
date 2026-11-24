// frontend/src/components/layout/footer.tsx

import { getFormatter, getT } from '@/i18n/server';
import { Link } from '@/i18n/navigation';
import { Instagram, Linkedin, Send } from 'lucide-react';
import { fetchFooter } from '@/lib/api/payload';
import type { Footer as FooterType } from '@payload-types';
import { isExternalUrl, safeUrl } from '@/lib/utils/safe-url';

const iconMap = {
  Instagram: <Instagram className="h-6 w-6" />,
  Linkedin: <Linkedin className="h-6 w-6" />,
  Telegram: <Send className="h-6 w-6" />,
};

export async function Footer() {
  // Without Payload the page still renders, with an empty footer.
  const [footerData, t, format]: [
    FooterType | null,
    Awaited<ReturnType<typeof getT>>,
    Awaited<ReturnType<typeof getFormatter>>,
  ] = await Promise.all([
    fetchFooter().catch(() => null),
    getT(),
    getFormatter(),
  ]);
  const { description, linkColumns, socialLinks } = footerData || {};

  return (
    <footer className="bg-muted/50">
      <div className="container mx-auto px-2 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-1">
            <h4 className="mb-4 text-lg font-bold">{t('site.shortName')}</h4>
            <p className="text-muted-foreground text-sm">{description}</p>
            <div className="mt-6 flex gap-4">
              {(socialLinks ?? []).map((link) => {
                const href = safeUrl(link.url);
                // A social icon without a usable address is left out.
                if (!href) return null;
                return (
                  <a
                    key={link.id}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {iconMap[link.platform as keyof typeof iconMap]}
                    <span className="sr-only">{link.platform}</span>
                  </a>
                );
              })}
            </div>
          </div>

          {/* ۲. اضافه کردن ?? [] برای linkColumns */}
          {(linkColumns ?? []).map((column) => (
            <div key={column.id}>
              <h4 className="mb-4 text-lg font-bold">{column.title}</h4>
              <ul className="space-y-3">
                {/* ۳. اضافه کردن ?? [] برای ستون لینک‌های داخلی */}
                {(column.links ?? []).map((link) => {
                  const href = safeUrl(link.url);
                  const className =
                    'text-muted-foreground hover:text-foreground text-sm';
                  return (
                    <li key={link.id}>
                      {!href ? (
                        <span className={className}>{link.label}</span>
                      ) : isExternalUrl(href) ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={className}
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link href={href} className={className}>
                          {link.label}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="text-muted-foreground mt-10 border-t pt-6 text-center text-sm">
          <p>{t('site.copyright', { year: format.year(new Date()) })}</p>
        </div>
      </div>
    </footer>
  );
}
