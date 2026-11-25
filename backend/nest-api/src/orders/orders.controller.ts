// backend/nest-api/src/orders/orders.controller.ts

import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { isUUID } from 'class-validator';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  OrderResponseDto,
  PaginatedOrdersResponseDto,
  toOrderResponse,
} from './dto/order-response.dto';
import { OrdersQueryDto } from './dto/orders-query.dto';
import { OrderIdParamDto } from './dto/order-id-param.dto';
import { OrdersService } from './orders.service';
import { Throttle } from '@nestjs/throttler';
import { env } from '../env';
import { ApiError } from '../common/http/api-error';

@UseGuards(AuthGuard('jwt'))
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // Each order fetches every cart product from Payload.
  @Throttle({
    default: { limit: env.RATE_LIMIT_ORDERS_PER_MINUTE, ttl: 60_000 },
  })
  @Post()
  createOrder(
    @Request() req: AuthenticatedRequest,
    @Headers('idempotency-key') checkoutKey: string | undefined,
    @Body() body: CreateOrderDto,
  ): Promise<OrderResponseDto> {
    if (!checkoutKey || !isUUID(checkoutKey, '4')) {
      throw new ApiError(
        HttpStatus.BAD_REQUEST,
        'IDEMPOTENCY_KEY_INVALID',
        'The Idempotency-Key header is missing or not a UUID v4.',
      );
    }

    return this.ordersService
      .createOrder(req.user.userId, checkoutKey, body.shipping)
      .then(toOrderResponse);
  }

  // The customer's order history, newest first, a page at a time.
  @Get()
  getUserOrders(
    @Request() req: AuthenticatedRequest,
    @Query() query: OrdersQueryDto,
  ): Promise<PaginatedOrdersResponseDto> {
    return this.ordersService.findUserOrders(
      req.user.userId,
      query.page,
      query.limit,
    );
  }

  @Get(':id')
  getUserOrder(
    @Request() req: AuthenticatedRequest,
    @Param() params: OrderIdParamDto,
  ): Promise<OrderResponseDto> {
    return this.ordersService
      .findOne(params.id, req.user.userId)
      .then(toOrderResponse);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  cancelOrder(
    @Request() req: AuthenticatedRequest,
    @Param() params: OrderIdParamDto,
  ): Promise<OrderResponseDto> {
    return this.ordersService
      .cancelOwnPendingOrder(params.id, req.user.userId)
      .then(toOrderResponse);
  }
}
