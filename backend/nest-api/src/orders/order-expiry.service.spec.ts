import type { OrdersService } from './orders.service';
import { OrderExpiryService } from './order-expiry.service';

describe('OrderExpiryService', () => {
  it('waits for a running sweep before shutdown completes', async () => {
    let finishSweep: (expired: number) => void = () => undefined;
    const expire = jest.fn(
      () =>
        new Promise<number>((resolve) => {
          finishSweep = resolve;
        }),
    );
    const service = new OrderExpiryService({
      expireStalePendingOrders: expire,
    } as unknown as OrdersService);

    service.onModuleInit();
    expect(expire).toHaveBeenCalledTimes(1);

    let destroyed = false;
    const destroy = service.onModuleDestroy().then(() => {
      destroyed = true;
    });

    await new Promise((resolve) => setImmediate(resolve));
    expect(destroyed).toBe(false);

    finishSweep(0);
    await destroy;
    expect(destroyed).toBe(true);
  });

  it('shuts down at once when no sweep is running', async () => {
    const service = new OrderExpiryService({
      expireStalePendingOrders: jest.fn(async () => 0),
    } as unknown as OrdersService);

    service.onModuleInit();
    await new Promise((resolve) => setImmediate(resolve));

    await expect(service.onModuleDestroy()).resolves.toBeUndefined();
  });
});
