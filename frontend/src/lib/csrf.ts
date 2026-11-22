// frontend/src/lib/csrf.ts
//
// Every request from the storefront's own pages to its /api routes that
// changes something carries this header. A form or script on another site
// cannot add a custom header without the browser asking our server first
// (CORS preflight), which it never allows.

export const CSRF_HEADER = 'x-watcher-csrf';
export const CSRF_HEADER_VALUE = '1';
