// nest-api/src/products/products.module.ts
import { Module } from '@nestjs/common';
import { PayloadModule } from '../payload/payload.module';
import { ProductsService } from './products.service';

@Module({
  imports: [PayloadModule],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
