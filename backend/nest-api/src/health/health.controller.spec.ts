import type { Response } from 'express';
import type { DataSource } from 'typeorm';
import type { PayloadClient } from '../payload/payload-client';
import { HealthController, READY_CHECK_TIMEOUT_MS } from './health.controller';

function setup(
  query: () => Promise<unknown>,
  ping: () => Promise<boolean> = async () => true,
) {
  const controller = new HealthController(
    { query } as unknown as DataSource,
    { ping } as unknown as PayloadClient,
  );
  const res = { status: jest.fn() };
  return {
    res: res as typeof res & Response,
    ready: () => controller.ready(res as unknown as Response),
  };
}

describe('HealthController.ready', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('is ready when both checks pass', async () => {
    const { res, ready } = setup(async () => [{ '?column?': 1 }]);

    await expect(ready()).resolves.toEqual({
      status: 'ok',
      checks: { database: 'up', payload: 'up' },
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('is not ready when the database query fails', async () => {
    const { res, ready } = setup(async () => {
      throw new Error('connection terminated');
    });

    await expect(ready()).resolves.toEqual({
      status: 'unavailable',
      checks: { database: 'down', payload: 'up' },
    });
    expect(res.status).toHaveBeenCalledWith(503);
  });

  it('counts a database that never answers as down', async () => {
    jest.useFakeTimers();
    const { res, ready } = setup(() => new Promise(() => undefined));

    const result = ready();
    await jest.advanceTimersByTimeAsync(READY_CHECK_TIMEOUT_MS);

    await expect(result).resolves.toMatchObject({
      checks: { database: 'down' },
    });
    expect(res.status).toHaveBeenCalledWith(503);
  });
});
