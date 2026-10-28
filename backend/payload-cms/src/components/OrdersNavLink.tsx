// backend/payload-cms/src/components/OrdersNavLink.tsx

import type { ServerProps } from 'payload';
import React from 'react';

// The link is a convenience only. /admin/orders enforces administrator
// access itself, and so does Nest.
export default function OrdersNavLink({ payload, user }: ServerProps) {
  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <a className="nav__link" href={`${payload.config.routes.admin}/orders`}>
      <span className="nav__link-label">سفارش‌ها</span>
    </a>
  );
}
