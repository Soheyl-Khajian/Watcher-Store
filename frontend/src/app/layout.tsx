// frontend/src/app/layout.tsx
//
// Pages render their document in app/[locale]/layout.tsx, in their
// language; the 404 page for addresses outside any language renders its
// own (not-found.tsx). Next.js still needs a root layout above both.

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
