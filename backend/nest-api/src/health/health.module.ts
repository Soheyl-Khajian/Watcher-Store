// backend/nest-api/src/health/health.module.ts

import { Module } from '@nestjs/common';
import { PayloadModule } from '../payload/payload.module';
import { HealthController } from './health.controller';

@Module({
  imports: [PayloadModule],
  controllers: [HealthController],
})
export class HealthModule {}
