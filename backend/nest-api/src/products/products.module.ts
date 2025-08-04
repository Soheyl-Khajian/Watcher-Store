// nest-api/src/products/products.module.ts
import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';

@Module({
  providers: [ProductsService],
  exports: [ProductsService], // <-- این خط مهم است
})
export class ProductsModule {}
