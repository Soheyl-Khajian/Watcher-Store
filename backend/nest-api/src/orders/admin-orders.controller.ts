// backend/nest-api/src/orders/admin-orders.controller.ts

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PayloadAdminGuard } from '../auth/guards/payload-admin.guard';
import { AdminOrdersQueryDto } from './dto/admin-orders-query.dto';
import { PaginatedOrdersResponseDto } from './dto/order-response.dto';
import { OrdersService } from './orders.service';

// Administrative reads. Authenticated with a Payload admin session rather
// than a Nest customer JWT, so this controller deliberately does not use
// AuthGuard('jwt').
@UseGuards(PayloadAdminGuard)
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  getOrders(
    @Query() query: AdminOrdersQueryDto,
  ): Promise<PaginatedOrdersResponseDto> {
    return this.ordersService.findOrdersForAdmin(query.page, query.limit);
  }
}
