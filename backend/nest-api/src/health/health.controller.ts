// backend/nest-api/src/health/health.controller.ts
//
// Two questions, two endpoints:
// - GET /health        liveness: is the process running? Independent of
//                      other services, so a Payload outage never gets this
//                      container restarted. Used by the Docker HEALTHCHECK.
// - GET /health/ready  readiness: can it serve requests right now? Checks
//                      the database and Payload; 503 when either is down,
//                      so a load balancer stops sending traffic here.

import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { DataSource } from 'typeorm';
import { PayloadClient } from '../payload/payload-client';

// A check slower than this counts as down; the caller is usually a probe
// with a short timeout of its own.
export const READY_CHECK_TIMEOUT_MS = 3000;

type CheckState = 'up' | 'down';

export interface ReadinessBody {
  status: 'ok' | 'unavailable';
  checks: { database: CheckState; payload: CheckState };
}

async function check(probe: () => Promise<boolean>): Promise<CheckState> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<boolean>((resolve) => {
    timer = setTimeout(() => resolve(false), READY_CHECK_TIMEOUT_MS);
  });

  try {
    const up = await Promise.race([probe().catch(() => false), timeout]);
    return up ? 'up' : 'down';
  } finally {
    clearTimeout(timer);
  }
}

// Probes poll these constantly.
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly payload: PayloadClient,
  ) {}

  @Get()
  live(): { status: string } {
    return { status: 'ok' };
  }

  @Get('ready')
  async ready(
    @Res({ passthrough: true }) res: Response,
  ): Promise<ReadinessBody> {
    const [database, payload] = await Promise.all([
      check(async () => {
        await this.dataSource.query('SELECT 1');
        return true;
      }),
      check(() => this.payload.ping()),
    ]);

    const ok = database === 'up' && payload === 'up';
    res.status(ok ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);

    return { status: ok ? 'ok' : 'unavailable', checks: { database, payload } };
  }
}
