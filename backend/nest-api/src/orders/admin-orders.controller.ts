// backend/nest-api/src/orders/admin-orders.controller.ts

import {
  Body,
  Controller,
  Get,
  HttpCode,
  Logger,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { PayloadAdminGuard } from '../auth/guards/payload-admin.guard';
import { AdminOrdersQueryDto } from './dto/admin-orders-query.dto';
import { OrderIdParamDto } from './dto/order-id-param.dto';
import {
  OrderResponseDto,
  PaginatedOrdersResponseDto,
} from './dto/order-response.dto';
import { ShipOrderDto } from './dto/ship-order.dto';
import { OrdersService } from './orders.service';

// Administrative reads and actions. Authenticated with a Payload admin session
// rather than a Nest customer JWT, so this controller deliberately does not use
// AuthGuard('jwt'). The guard runs before parameter validation.
@UseGuards(PayloadAdminGuard)
@Controller('admin/orders')
export class AdminOrdersController {
  private readonly logger = new Logger(AdminOrdersController.name);

  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  getOrders(
    @Query() query: AdminOrdersQueryDto,
  ): Promise<PaginatedOrdersResponseDto> {
    return this.ordersService.findOrdersForAdmin(query.page, query.limit);
  }

  @Post(':id/ship')
  @HttpCode(200)
  async shipOrder(
    @Request() req: AuthenticatedRequest,
    @Param() params: OrderIdParamDto,
    @Body() body: ShipOrderDto,
  ): Promise<OrderResponseDto> {
    const order = await this.ordersService.shipOrder(
      params.id,
      body.trackingCode ?? null,
    );
    this.audit(req, order.id, 'shipped');
    return order;
  }

  @Post(':id/complete')
  @HttpCode(200)
  async completeOrder(
    @Request() req: AuthenticatedRequest,
    @Param() params: OrderIdParamDto,
  ): Promise<OrderResponseDto> {
    const order = await this.ordersService.completeOrder(params.id);
    this.audit(req, order.id, 'completed');
    return order;
  }

  @Post(':id/cancel')
  @HttpCode(200)
  async cancelOrder(
    @Request() req: AuthenticatedRequest,
    @Param() params: OrderIdParamDto,
  ): Promise<OrderResponseDto> {
    const order = await this.ordersService.cancelOrderAsAdmin(params.id);
    this.audit(req, order.id, 'cancelled');
    return order;
  }

  @Post(':id/mark-refunded')
  @HttpCode(200)
  async markRefunded(
    @Request() req: AuthenticatedRequest,
    @Param() params: OrderIdParamDto,
  ): Promise<OrderResponseDto> {
    const order = await this.ordersService.markOrderRefunded(params.id);
    this.audit(req, order.id, 'marked as refunded');
    return order;
  }

  // Ids only: no customer names, addresses or phone numbers are logged.
  private audit(req: AuthenticatedRequest, orderId: number, action: string) {
    this.logger.log(`Admin ${req.user.userId} ${action} order ${orderId}`);
  }
}
