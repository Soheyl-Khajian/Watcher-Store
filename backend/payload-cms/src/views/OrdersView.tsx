// backend/payload-cms/src/views/OrdersView.tsx

import { DefaultTemplate } from '@payloadcms/next/templates';
import { Gutter } from '@payloadcms/ui';
import type { AdminViewServerProps, PayloadRequest } from 'payload';
import React from 'react';
import {
  fetchNestOrders,
  getSessionToken,
  isOrderAction,
  ORDER_ACTION_OUTCOMES,
  parsePageParam,
  type NestOrder,
  type NestOrdersFailureReason,
  type OrderAction,
  type OrderActionOutcome,
} from '../utils/nestOrders';
import {
  formatToman,
  OrderItemLine,
  priceFormatter,
  ShippingCell,
} from './OrderCells';

const STATUS_LABELS: Record<string, string> = {
  pending: 'در انتظار پرداخت',
  processing: 'در حال پردازش',
  shipped: 'ارسال‌شده',
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

const ACTION_DONE: Record<OrderAction, string> = {
  ship: 'به «ارسال‌شده» تغییر کرد.',
  complete: 'به «تکمیل‌شده» تغییر کرد.',
  cancel: 'لغو شد و موجودی کالاها برگشت.',
  'mark-refunded': 'به‌عنوان «بازپرداخت شد» علامت خورد.',
};

const ACTION_FAILED: Record<Exclude<OrderActionOutcome, 'done'>, string> = {
  conflict: 'این کار در وضعیت فعلی سفارش ممکن نیست؛ صفحه را تازه کنید.',
  invalid:
    'کد رهگیری نامعتبر است: فقط حروف انگلیسی، رقم، نقطه، خط تیره و زیرخط.',
  not_found: 'سفارش پیدا نشد.',
  forbidden: 'نشست شما معتبر نیست یا اجازه این کار را ندارید.',
  unavailable: 'سرویس سفارش‌ها در دسترس نیست. کمی بعد دوباره تلاش کنید.',
  not_configured:
    'آدرس سرویس سفارش‌ها (NEST_INTERNAL_URL) تنظیم نشده است. با مدیر سیستم تماس بگیرید.',
};

const dateFormatter = new Intl.DateTimeFormat('fa-IR', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Tehran',
});

// A refund the shop owes, so it cannot be missed in the list.
function RefundNote({
  refundStatus,
}: {
  refundStatus: NestOrder['refundStatus'];
}) {
  if (refundStatus === 'required') {
    return (
      <div style={{ color: 'var(--theme-error-500)', fontWeight: 600 }}>
        نیاز به بازپرداخت
      </div>
    );
  }
  if (refundStatus === 'refunded') {
    return <div style={{ opacity: 0.7 }}>بازپرداخت شد</div>;
  }
  return null;
}

// The outcome of the last action (?order=&action=&result=, set by the
// order-actions endpoint). Only known values are shown.
function ActionNotice({
  searchParams,
}: {
  searchParams: AdminViewServerProps['searchParams'];
}) {
  const order = Number(searchParams?.order);
  const action = searchParams?.action;
  const result = searchParams?.result as OrderActionOutcome | undefined;
  if (
    !Number.isSafeInteger(order) ||
    !isOrderAction(action) ||
    !result ||
    !(ORDER_ACTION_OUTCOMES as readonly string[]).includes(result)
  ) {
    return null;
  }
  const done = result === 'done';
  return (
    <div
      role="status"
      style={{
        padding: '0.75rem 1rem',
        marginBottom: '1rem',
        borderRadius: 4,
        border: `1px solid ${done ? 'var(--theme-success-500)' : 'var(--theme-error-500)'}`,
      }}
    >
      سفارش {priceFormatter.format(order)}{' '}
      {done
        ? ACTION_DONE[action]
        : ACTION_FAILED[result as Exclude<OrderActionOutcome, 'done'>]}
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  cursor: 'pointer',
  padding: '0.25rem 0.75rem',
  borderRadius: 4,
  border: '1px solid var(--theme-elevation-300)',
  background: 'var(--theme-elevation-50)',
  color: 'inherit',
  font: 'inherit',
};

// What can be done with an order in its current status (Nest's state
// machine decides; these are just the buttons that make sense). Plain forms:
// they post to /api/order-actions/:id/:action and come back here.
function OrderActions({
  order,
  apiRoute,
  page,
}: {
  order: NestOrder;
  apiRoute: string;
  page: number;
}) {
  const formFor = (action: OrderAction, children: React.ReactNode) => (
    <form
      method="post"
      action={`${apiRoute}/order-actions/${order.id}/${action}`}
      style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
    >
      <input type="hidden" name="page" value={page} />
      {children}
    </form>
  );

  // Cancelling cannot be undone: it sits behind a second click.
  const cancel = formFor(
    'cancel',
    <details>
      <summary style={{ cursor: 'pointer' }}>لغو سفارش</summary>
      <button type="submit" style={buttonStyle}>
        تأیید لغو سفارش {priceFormatter.format(order.id)}
      </button>
    </details>,
  );

  const actions: React.ReactNode[] = [];
  if (order.status === 'processing') {
    actions.push(
      formFor(
        'ship',
        <>
          <input
            name="trackingCode"
            placeholder="کد رهگیری (اختیاری)"
            aria-label={`کد رهگیری سفارش ${order.id}`}
            maxLength={64}
            dir="ltr"
            style={{ ...buttonStyle, cursor: 'text', width: '11rem' }}
          />
          <button type="submit" style={buttonStyle}>
            ثبت ارسال
          </button>
        </>,
      ),
      cancel,
    );
  } else if (order.status === 'pending') {
    actions.push(cancel);
  } else if (order.status === 'shipped') {
    actions.push(
      formFor(
        'complete',
        <button type="submit" style={buttonStyle}>
          ثبت تحویل
        </button>,
      ),
    );
  }
  if (order.refundStatus === 'required') {
    actions.push(
      formFor(
        'mark-refunded',
        <button type="submit" style={buttonStyle}>
          بازپرداخت انجام شد
        </button>,
      ),
    );
  }

  if (actions.length === 0) {
    return <span style={{ opacity: 0.6 }}>—</span>;
  }
  return (
    <div style={{ display: 'grid', gap: '0.5rem' }}>
      {actions.map((action, i) => (
        <React.Fragment key={i}>{action}</React.Fragment>
      ))}
    </div>
  );
}

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
      <ActionNotice searchParams={searchParams} />
      <p style={{ marginBottom: '1rem' }}>
        مجموع سفارش‌ها: {priceFormatter.format(totalItems)}
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
              <th style={cellStyle}>عملیات</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td style={cellStyle}>{order.id}</td>
                <td style={cellStyle}>
                  <a href={`${adminRoute}/collections/users/${order.userId}`}>
                    {customerEmails.has(order.userId) ? (
                      <bdi dir="ltr">{customerEmails.get(order.userId)}</bdi>
                    ) : (
                      `کاربر ${order.userId}`
                    )}
                  </a>
                </td>
                <td style={cellStyle}>
                  {STATUS_LABELS[order.status] ?? order.status}
                  {order.trackingCode && (
                    <div>
                      کد رهگیری: <bdi dir="ltr">{order.trackingCode}</bdi>
                    </div>
                  )}
                  <RefundNote refundStatus={order.refundStatus} />
                </td>
                <td style={cellStyle}>
                  <ul
                    style={{
                      margin: 0,
                      paddingInlineStart: '1rem',
                      minWidth: '16rem',
                    }}
                  >
                    {order.items.map((item) => (
                      <li key={item.id}>
                        <OrderItemLine
                          name={productNames.get(item.productId)}
                          item={item}
                        />
                      </li>
                    ))}
                  </ul>
                </td>
                <td style={cellStyle}>
                  <ShippingCell shipping={order.shipping} />
                </td>
                <td style={cellStyle}>{formatToman(order.total)}</td>
                <td style={cellStyle}>{formatDate(order.createdAt)}</td>
                <td style={cellStyle}>
                  <OrderActions
                    order={order}
                    apiRoute={payload.config.routes.api}
                    page={page}
                  />
                </td>
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
      {/* This view is written in Persian, so it reads right to left even
          when the admin panel itself is in English. */}
      <div dir="rtl" lang="fa">
        <Gutter>{content}</Gutter>
      </div>
    </DefaultTemplate>
  );
}
