// frontend/src/lib/utils/pagination.ts
//
// Which page numbers a pager shows: the first and last page, the current
// page with its neighbours, and a gap ('gap') where pages are skipped.
//   pageWindow(6, 12) -> [1, 'gap', 5, 6, 7, 'gap', 12]

export type PageItem = number | 'gap';

export function pageWindow(
  page: number,
  totalPages: number,
  neighbours = 1,
): PageItem[] {
  const total = Math.max(1, Math.floor(totalPages));
  const current = Math.min(Math.max(1, Math.floor(page)), total);

  const shown = new Set<number>([1, total]);
  for (let p = current - neighbours; p <= current + neighbours; p += 1) {
    if (p >= 1 && p <= total) shown.add(p);
  }

  const pages = [...shown].sort((a, b) => a - b);
  const items: PageItem[] = [];
  pages.forEach((p, i) => {
    const previous = pages[i - 1];
    if (previous !== undefined && p - previous > 1) {
      // A gap of a single page shows that page instead of "…".
      items.push(p - previous === 2 ? previous + 1 : 'gap');
    }
    items.push(p);
  });
  return items;
}
