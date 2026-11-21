import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

@Controller()
export class AppController {
  // Container health checks poll this constantly.
  @SkipThrottle()
  @Get('health')
  health(): { status: string } {
    return { status: 'ok' };
  }
}
