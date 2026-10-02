// backend/nest-api/src/orders/orders.controller.ts

import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { isUUID } from 'class-validator';
import { OrderResponseDto } from './dto/order-response.dto';
import { OrdersService } from './orders.service';

@UseGuards(AuthGuard('jwt'))
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  createOrder(
    @Request() req: any,
    @Headers('idempotency-key') checkoutKey: string | undefined,
  ): Promise<OrderResponseDto> {
    if (!checkoutKey || !isUUID(checkoutKey, '4')) {
      throw new BadRequestException('Idempotency-Key must be a valid UUID v4.');
    }

    return this.ordersService.createOrder(req.user.userId, checkoutKey);
  }

  @Get()
  getUserOrders(@Request() req: any): Promise<OrderResponseDto[]> {
    return this.ordersService.findUserOrders(req.user.userId);
  }
}
