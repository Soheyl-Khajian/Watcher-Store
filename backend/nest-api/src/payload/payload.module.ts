// backend/nest-api/src/payload/payload.module.ts

import { Module } from '@nestjs/common';
import { PayloadClient } from './payload-client';

@Module({
  providers: [PayloadClient],
  exports: [PayloadClient],
})
export class PayloadModule {}
