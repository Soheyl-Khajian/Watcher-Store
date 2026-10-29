// frontend/src/app/(main)/checkout/page.tsx

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/store/auth';
import type { Product, CartItem } from '@/types';
import { fetchProductsByIds } from '@/lib/api/payload';
import {
  createOrder,
  initiatePayment,
  type CreateOrderResult,
} from '@/lib/api/nestjs';
import {
  EMPTY_SHIPPING_FORM,
  SHIPPING_FIELD_ORDER,
  SHIPPING_MAX_LENGTH,
  validateShipping,
  type ShippingErrors,
  type ShippingField,
  type ShippingFormValues,
} from '@/lib/validation/shipping';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { getCurrentPrice } from '@/lib/utils/pricing';
import { cn } from '@/lib/utils';

function orderErrorMessage(
  result: Extract<CreateOrderResult, { ok: false }>,
): string {
  if (result.status === 401) {
    return 'نشست شما منقضی شده است. لطفاً دوباره وارد شوید.';
  }
  if (result.status === 409 && result.message) {
    return result.message;
  }
  if (result.status === 400) {
    return 'اطلاعات ارسال یا سبد خرید معتبر نیست. لطفاً فرم را بررسی کنید.';
  }
  return 'خطا در ثبت سفارش. لطفاً دوباره تلاش کنید.';
}

function FormField({
  id,
  label,
  required,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id}>
        {label}
        {required ? (
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
        ) : (
          <span className="text-muted-foreground font-normal">(اختیاری)</span>
        )}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default function CheckoutPage() {
  const { cart, token, setCart } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [form, setForm] = useState<ShippingFormValues>(EMPTY_SHIPPING_FORM);
  const [errors, setErrors] = useState<ShippingErrors>({});
  // Set once the order exists on the server. From then on the page only
  // retries payment for this order and never creates another one.
  const [placedOrderId, setPlacedOrderId] = useState<number | null>(null);

  const checkoutKeyRef = useRef<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    if (
      !isLoading &&
      !isProcessing &&
      placedOrderId === null &&
      (!token || !cart || cart.items.length === 0)
    ) {
      router.push('/');
    }
  }, [token, cart, router, isLoading, isProcessing, placedOrderId]);

  useEffect(() => {
    const getProducts = async () => {
      if (cart && cart.items.length > 0) {
        const productIds = cart.items.map((item: CartItem) => item.productId);
        const fetchedProducts = await fetchProductsByIds(productIds);
        setProducts(fetchedProducts);
      }
      setIsLoading(false);
    };
    getProducts();
  }, [cart]);

  const handleChange = (field: ShippingField, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  };

  const fieldProps = (field: ShippingField) => ({
    id: `shipping-${field}`,
    name: field,
    value: form[field],
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      handleChange(field, event.target.value),
    disabled: isProcessing,
    maxLength: SHIPPING_MAX_LENGTH[field],
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? `shipping-${field}-error` : undefined,
  });

  const startPayment = async (orderId: number) => {
    if (!token) return;
    setIsProcessing(true);

    const paymentData = await initiatePayment(orderId, token);

    if (paymentData && paymentData.paymentUrl) {
      window.location.href = paymentData.paymentUrl;
      return;
    }

    toast.error('خطا در اتصال به درگاه پرداخت.');
    setIsProcessing(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || isProcessing) return;

    const result = validateShipping(form);

    if (!result.ok) {
      setErrors(result.errors);
      const firstInvalid = SHIPPING_FIELD_ORDER.find(
        (field) => result.errors[field],
      );
      if (firstInvalid) {
        document.getElementById(`shipping-${firstInvalid}`)?.focus();
      }
      return;
    }

    setErrors({});
    setIsProcessing(true);

    const checkoutKey = checkoutKeyRef.current ?? crypto.randomUUID();
    checkoutKeyRef.current = checkoutKey;

    const created = await createOrder(token, checkoutKey, result.payload);

    if (!created.ok) {
      toast.error(orderErrorMessage(created));
      setIsProcessing(false);
      return;
    }

    // The server emptied the cart when it created the order.
    setPlacedOrderId(created.order.id);
    setCart(null);
    toast.success('سفارش ثبت شد. در حال انتقال به درگاه پرداخت...');

    await startPayment(created.order.id);
  };

  const cartTotal = useMemo(() => {
    if (!cart?.items || products.length === 0) return 0;
    return cart.items.reduce((total, item) => {
      const product = products.find(
        (p: Product) => String(p.id) === String(item.productId),
      );
      if (!product) return total;
      const price = getCurrentPrice(product);
      return total + price * item.quantity;
    }, 0);
  }, [cart, products]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fa-IR').format(price) + ' تومان';
  };

  if (placedOrderId !== null) {
    return (
      <div className="container mx-auto max-w-2xl py-12">
        <Card>
          <CardHeader>
            <CardTitle>سفارش شما ثبت شد</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>
              شماره سفارش:{' '}
              <span className="font-semibold">
                {new Intl.NumberFormat('fa-IR', { useGrouping: false }).format(
                  placedOrderId,
                )}
              </span>
            </p>
            <p className="text-muted-foreground text-sm">
              اتصال به درگاه پرداخت برقرار نشد. سفارش شما ذخیره شده است و
              می‌توانید دوباره برای پرداخت تلاش کنید.
            </p>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button
              className="cursor-pointer"
              onClick={() => startPayment(placedOrderId)}
              disabled={isProcessing}
            >
              {isProcessing ? 'در حال اتصال...' : 'تلاش مجدد برای پرداخت'}
            </Button>
            <Button asChild variant="outline">
              <Link href="/">بازگشت به فروشگاه</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (isLoading || !cart) {
    return <div>در حال بارگذاری اطلاعات سفارش...</div>;
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="container mx-auto max-w-2xl space-y-6 py-12"
    >
      <Card>
        <CardHeader>
          <CardTitle>اطلاعات ارسال</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField
            id="shipping-recipientName"
            label="نام و نام خانوادگی گیرنده"
            required
            error={errors.recipientName}
          >
            <Input {...fieldProps('recipientName')} autoComplete="name" />
          </FormField>

          <FormField
            id="shipping-phone"
            label="شماره موبایل"
            required
            error={errors.phone}
          >
            <Input
              {...fieldProps('phone')}
              dir="ltr"
              inputMode="tel"
              autoComplete="tel"
              placeholder="09123456789"
            />
          </FormField>

          <FormField
            id="shipping-province"
            label="استان"
            required
            error={errors.province}
          >
            <Input {...fieldProps('province')} autoComplete="address-level1" />
          </FormField>

          <FormField
            id="shipping-city"
            label="شهر"
            required
            error={errors.city}
          >
            <Input {...fieldProps('city')} autoComplete="address-level2" />
          </FormField>

          <FormField
            id="shipping-address"
            label="نشانی کامل"
            required
            error={errors.address}
            className="sm:col-span-2"
          >
            <Textarea
              {...fieldProps('address')}
              rows={3}
              autoComplete="street-address"
            />
          </FormField>

          <FormField
            id="shipping-postalCode"
            label="کد پستی"
            required
            error={errors.postalCode}
          >
            <Input
              {...fieldProps('postalCode')}
              dir="ltr"
              inputMode="numeric"
              autoComplete="postal-code"
              placeholder="1234567890"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField id="shipping-unit" label="واحد" error={errors.unit}>
              <Input {...fieldProps('unit')} dir="ltr" />
            </FormField>
            <FormField id="shipping-floor" label="طبقه" error={errors.floor}>
              <Input {...fieldProps('floor')} dir="ltr" />
            </FormField>
          </div>

          <FormField
            id="shipping-deliveryNotes"
            label="توضیحات تحویل"
            error={errors.deliveryNotes}
            className="sm:col-span-2"
          >
            <Textarea {...fieldProps('deliveryNotes')} rows={2} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>خلاصه سفارش و تسویه حساب</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            {cart.items.map((item: CartItem) => {
              const product = products.find(
                (p: Product) => String(p.id) === String(item.productId),
              );
              if (!product) return null;

              const currentPrice = getCurrentPrice(product);

              return (
                <li key={item.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{product.name}</p>
                    <p className="text-muted-foreground text-sm" dir="ltr">
                      {item.quantity} x {formatPrice(currentPrice)}
                    </p>
                  </div>
                  <p className="font-semibold">
                    {formatPrice(currentPrice * item.quantity)}
                  </p>
                </li>
              );
            })}
          </ul>
          <Separator className="my-4" />
          <div className="flex justify-between text-lg font-bold">
            <p>جمع کل</p>
            <p>{formatPrice(cartTotal)}</p>
          </div>
          <p className="text-muted-foreground mt-2 text-sm">
            هزینه ارسال پس از ثبت سفارش با شما هماهنگ می‌شود.
          </p>
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            className="w-full cursor-pointer"
            disabled={isProcessing}
          >
            {isProcessing ? 'در حال پردازش...' : 'ثبت سفارش و پرداخت'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
