// backend/payload-cms/src/endpoints/orderActions.ts
//
// POST /api/order-actions/:id/:action  (ship | complete | cancel | mark-refunded)
//
// The admin Orders view's buttons are plain HTML forms that post here. The
// endpoint passes the action to Nest as the logged-in administrator and
// sends the browser back to the Orders view with the outcome, so the page
// works without client-side JavaScript.
//
// Protection: only an administrator's session is accepted. Payload honours
// the session cookie only for requests from its own origin (csrf in
// payload.config.ts), and the cookie is SameSite=Lax, so another site cannot
// submit these forms for an administrator. Nest checks the administrator
// again and allows only valid status changes.

import type { Endpoint, PayloadRequest } from 'payload';
import {
  getSessionToken,
  isOrderAction,
  parsePageParam,
  performOrderAction,
} from '../utils/nestOrders';

// The session token: the admin panel's cookie, or an API client's
// "Authorization: JWT <token>" header.
function sessionToken(req: PayloadRequest): string | null {
  const header = req.headers.get('authorization');
  if (header?.startsWith('JWT ')) {
    return header.slice(4).trim() || null;
  }
  return getSessionToken(req.headers, req.payload.config.cookiePrefix);
}

async function readForm(req: PayloadRequest): Promise<URLSearchParams> {
  const type = req.headers.get('content-type') ?? '';
  try {
    if (type.includes('application/x-www-form-urlencoded') && req.text) {
      return new URLSearchParams(await req.text());
    }
    if (type.includes('multipart/form-data') && req.formData) {
      const data = await req.formData();
      const params = new URLSearchParams();
      for (const [key, value] of data.entries()) {
        if (typeof value === 'string') params.set(key, value);
      }
      return params;
    }
  } catch {
    // An unreadable body: treated as empty.
  }
  return new URLSearchParams();
}

export const orderActionsEndpoint: Endpoint = {
  path: '/order-actions/:id/:action',
  method: 'post',
  handler: async (req) => {
    if (!req.user || req.user.role !== 'admin') {
      return Response.json({ message: 'Forbidden' }, { status: 403 });
    }

    const id = Number(req.routeParams?.id);
    const action = req.routeParams?.action;
    if (!Number.isSafeInteger(id) || id < 1 || !isOrderAction(action)) {
      return Response.json({ message: 'Not found' }, { status: 404 });
    }

    const token = sessionToken(req);
    if (!token) {
      return Response.json({ message: 'Forbidden' }, { status: 403 });
    }

    const form = await readForm(req);
    const trackingCode = form.get('trackingCode')?.trim() || undefined;
    const page = parsePageParam(form.get('page'));

    const outcome = await performOrderAction({
      token,
      orderId: id,
      action,
      trackingCode,
      logger: req.payload.logger,
    });

    const back = new URLSearchParams({
      page: String(page),
      order: String(id),
      action,
      result: outcome,
    });
    // 303: the browser follows with a GET, so reloading the page does not
    // submit the form again.
    return new Response(null, {
      status: 303,
      headers: {
        Location: `${req.payload.config.routes.admin}/orders?${back}`,
      },
    });
  },
};
