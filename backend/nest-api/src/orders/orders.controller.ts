// backend/nest-api/src/orders/orders.controller.ts

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { isUUID } from 'class-validator';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { OrdersService } from './orders.service';

@UseGuards(AuthGuard('jwt'))
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  createOrder(
    @Request() req: AuthenticatedRequest,
    @Headers('idempotency-key') checkoutKey: string | undefined,
    @Body() body: CreateOrderDto,
  ): Promise<OrderResponseDto> {
    if (!checkoutKey || !isUUID(checkoutKey, '4')) {
      throw new BadRequestException('Idempotency-Key must be a valid UUID v4.');
    }

    return this.ordersService.createOrder(
      req.user.userId,
      checkoutKey,
      body.shipping,
    );
  }

  @Get()
  getUserOrders(
    @Request() req: AuthenticatedRequest,
  ): Promise<OrderResponseDto[]> {
    return this.ordersService.findUserOrders(req.user.userId);
  }
}
