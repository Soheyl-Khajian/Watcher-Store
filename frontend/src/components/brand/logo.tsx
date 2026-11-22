// frontend/src/components/brand/logo.tsx
//
// The shop's mark (a shield with a camera lens), the same drawing as the
// browser icon (app/icon.svg). Decorative: the shop name next to it names
// the link.

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M32 4 56 13v17c0 15-10 25-24 30C18 55 8 45 8 30V13z"
        className="fill-primary"
      />
      <circle cx="32" cy="31" r="13" fill="#fff" />
      <circle cx="32" cy="31" r="7" fill="#1c1917" />
      <circle cx="35.5" cy="27.5" r="2.25" fill="#fff" />
    </svg>
  );
}
