// backend/payload-cms/src/views/OrdersView.tsx

import { DefaultTemplate } from '@payloadcms/next/templates';
import { Gutter } from '@payloadcms/ui';
import type { AdminViewServerProps, PayloadRequest } from 'payload';
import React from 'react';
import {
  fetchNestOrders,
  getSessionToken,
  parsePageParam,
  type NestOrder,
  type NestOrdersFailureReason,
} from '../utils/nestOrders';

const STATUS_LABELS: Record<string, string> = {
  pending: 'در انتظار پرداخت',
  processing: 'در حال پردازش',
  completed: 'تکمیل‌شده',
  cancelled: 'لغوشده',
};

const FAILURE_MESSAGES: Record<NestOrdersFailureReason, string> = {
  not_configured:
    'آدرس سرویس سفارش‌ها (NEST_INTERNAL_URL) تنظیم نشده است. با مدیر سیستم تماس بگیرید.',
  unauthorized: 'نشست شما معتبر نیست. لطفاً دوباره وارد شوید.',
  forbidden: 'شما اجازه مشاهده سفارش‌ها را ندارید.',
  unavailable:
    'سرویس سفارش‌ها در حال حاضر در دسترس نیست. چند لحظه بعد دوباره تلاش کنید.',
  invalid_response:
    'پاسخ سرویس سفارش‌ها نامعتبر بود. با مدیر سیستم تماس بگیرید.',
};

const priceFormatter = new Intl.NumberFormat('fa-IR');
const dateFormatter = new Intl.DateTimeFormat('fa-IR', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Tehran',
});

const formatToman = (amount: number): string =>
  `${priceFormatter.format(amount)} تومان`;

const formatDate = (value: string): string => {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
};

const cellStyle: React.CSSProperties = {
  padding: '0.75rem',
  textAlign: 'start',
  verticalAlign: 'top',
  borderBottom: '1px solid var(--theme-elevation-100)',
};

function Notice({ children }: { children: React.ReactNode }) {
  return <p style={{ padding: '1rem 0' }}>{children}</p>;
}

const wrappingText: React.CSSProperties = {
  overflowWrap: 'anywhere',
  whiteSpace: 'pre-wrap',
};

function ShippingCell({ shipping }: { shipping: NestOrder['shipping'] }) {
  const hasDetails =
    !!shipping && Object.values(shipping).some((value) => value !== null);

  if (!shipping || !hasDetails) {
    return <span>ثبت نشده</span>;
  }

  const location = [shipping.province, shipping.city]
    .filter((part): part is string => !!part)
    .join('، ');

  const unitAndFloor = [
    shipping.unit ? `واحد ${shipping.unit}` : null,
    shipping.floor ? `طبقه ${shipping.floor}` : null,
  ]
    .filter((part): part is string => part !== null)
    .join('، ');

  return (
    <div style={{ ...wrappingText, minWidth: '14rem', maxWidth: '24rem' }}>
      {shipping.recipientName && <strong>{shipping.recipientName}</strong>}
      {shipping.phone && (
        <div>
          <bdi dir="ltr">{shipping.phone}</bdi>
        </div>
      )}
      {location && <div>{location}</div>}
      {shipping.address && <div>{shipping.address}</div>}
      {unitAndFloor && <div>{unitAndFloor}</div>}
      {shipping.postalCode && (
        <div>
          کد پستی: <bdi dir="ltr">{shipping.postalCode}</bdi>
        </div>
      )}
      {shipping.deliveryNotes && <div>توضیحات: {shipping.deliveryNotes}</div>}
    </div>
  );
}

// Customer emails and product names live in Payload. Lookups run as the
// logged-in administrator with access control applied, and any failure falls
// back to raw IDs instead of breaking the page.
async function loadLookups(req: PayloadRequest, orders: NestOrder[]) {
  const customerEmails = new Map<number, string>();
  const productNames = new Map<string, string>();

  const userIds = [...new Set(orders.map((order) => order.userId))];
  const productIds = [
    ...new Set(
      orders.flatMap((order) =>
        order.items
          .map((item) => Number(item.productId))
          .filter((id) => Number.isSafeInteger(id)),
      ),
    ),
  ];

  try {
    if (userIds.length > 0) {
      const users = await req.payload.find({
        collection: 'users',
        where: { id: { in: userIds } },
        select: { email: true },
        depth: 0,
        pagination: false,
        overrideAccess: false,
        user: req.user,
      });

      for (const doc of users.docs) {
        if (typeof doc.email === 'string') {
          customerEmails.set(Number(doc.id), doc.email);
        }
      }
    }

    if (productIds.length > 0) {
      const products = await req.payload.find({
        collection: 'products',
        where: { id: { in: productIds } },
        select: { name: true },
        depth: 0,
        pagination: false,
        overrideAccess: false,
        user: req.user,
      });

      for (const doc of products.docs) {
        if (typeof doc.name === 'string') {
          productNames.set(String(doc.id), doc.name);
        }
      }
    }
  } catch (error) {
    req.payload.logger.error(
      `Orders view lookup failed: ${
        error instanceof Error ? error.message : 'unknown error'
      }`,
    );
  }

  return { customerEmails, productNames };
}

async function renderContent(
  req: PayloadRequest,
  searchParams: AdminViewServerProps['searchParams'],
): Promise<React.ReactNode> {
  const { payload, user } = req;

  // Custom views are public by default, so authorization is enforced here and
  // again by Nest.
  if (!user) {
    return <Notice>برای مشاهده سفارش‌ها باید وارد شوید.</Notice>;
  }

  if (user.role !== 'admin') {
    return <Notice>{FAILURE_MESSAGES.forbidden}</Notice>;
  }

  const token = getSessionToken(req.headers, payload.config.cookiePrefix);

  if (!token) {
    return <Notice>{FAILURE_MESSAGES.unauthorized}</Notice>;
  }

  const result = await fetchNestOrders({
    token,
    page: parsePageParam(searchParams?.page),
    logger: payload.logger,
  });

  if (!result.ok) {
    return <Notice>{FAILURE_MESSAGES[result.reason]}</Notice>;
  }

  const { items: orders, page, totalItems, totalPages } = result.data;
  const adminRoute = payload.config.routes.admin;
  const ordersPath = `${adminRoute}/orders`;

  if (orders.length === 0) {
    return (
      <>
        <h1>سفارش‌ها</h1>
        <Notice>
          سفارشی در این صفحه یافت نشد.{' '}
          {totalItems > 0 && <a href={ordersPath}>بازگشت به صفحه اول</a>}
        </Notice>
      </>
    );
  }

  const { customerEmails, productNames } = await loadLookups(req, orders);

  return (
    <>
      <h1>سفارش‌ها</h1>
      <p style={{ marginBottom: '1rem' }}>
        این فهرست فقط‌خواندنی است. مجموع سفارش‌ها:{' '}
        {priceFormatter.format(totalItems)}
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={cellStyle}>شماره</th>
              <th style={cellStyle}>مشتری</th>
              <th style={cellStyle}>وضعیت</th>
              <th style={cellStyle}>اقلام</th>
              <th style={cellStyle}>اطلاعات ارسال</th>
              <th style={cellStyle}>جمع کل</th>
              <th style={cellStyle}>تاریخ ثبت</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td style={cellStyle}>{order.id}</td>
                <td style={cellStyle}>
                  <a href={`${adminRoute}/collections/users/${order.userId}`}>
                    {customerEmails.get(order.userId) ??
                      `کاربر ${order.userId}`}
                  </a>
                </td>
                <td style={cellStyle}>
                  {STATUS_LABELS[order.status] ?? order.status}
                </td>
                <td style={cellStyle}>
                  <ul style={{ margin: 0, paddingInlineStart: '1rem' }}>
                    {order.items.map((item) => (
                      <li key={item.id}>
                        {productNames.get(item.productId) ??
                          `محصول ${item.productId}`}{' '}
                        × {priceFormatter.format(item.quantity)} —{' '}
                        {formatToman(item.price)}
                      </li>
                    ))}
                  </ul>
                </td>
                <td style={cellStyle}>
                  <ShippingCell shipping={order.shipping} />
                </td>
                <td style={cellStyle}>{formatToman(order.total)}</td>
                <td style={cellStyle}>{formatDate(order.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <nav style={{ display: 'flex', gap: '1rem', paddingTop: '1rem' }}>
        {page > 1 && <a href={`${ordersPath}?page=${page - 1}`}>صفحه قبل</a>}
        <span>
          صفحه {priceFormatter.format(page)} از{' '}
          {priceFormatter.format(Math.max(totalPages, 1))}
        </span>
        {page < totalPages && (
          <a href={`${ordersPath}?page=${page + 1}`}>صفحه بعد</a>
        )}
      </nav>
    </>
  );
}

export default async function OrdersView({
  initPageResult,
  params,
  searchParams,
}: AdminViewServerProps) {
  const { req } = initPageResult;
  const content = await renderContent(req, searchParams);

  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={initPageResult.locale}
      params={params}
      payload={req.payload}
      permissions={initPageResult.permissions}
      searchParams={searchParams}
      user={req.user || undefined}
      visibleEntities={initPageResult.visibleEntities}
    >
      <Gutter>{content}</Gutter>
    </DefaultTemplate>
  );
}
