// src/orders/orders.controller.ts
import { Controller, Post, Get, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OrdersService } from './orders.service';

@UseGuards(AuthGuard('jwt')) // تمام مسیرهای این کنترلر محافظت شده هستند
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  createOrder(@Request() req) {
    const userId = req.user.userId;
    return this.ordersService.createOrder(userId);
  }

  @Get()
  getUserOrders(@Request() req) {
    const userId = req.user.userId;
    return this.ordersService.findUserOrders(userId);
  }
}
