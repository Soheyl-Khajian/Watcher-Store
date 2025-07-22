// src/orders/orders.controller.ts
import { Controller, Post, Get, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OrdersService } from './orders.service';
import { OrderResponseDto } from './dto/order-response.dto'; // <-- DTO را وارد کنید

@UseGuards(AuthGuard('jwt'))
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  // نوع خروجی را مشخص می‌کنیم
  createOrder(@Request() req): Promise<OrderResponseDto> {
    const userId = req.user.userId;
    return this.ordersService.createOrder(userId);
  }

  @Get()
  // نوع خروجی را مشخص می‌کنیم
  getUserOrders(@Request() req): Promise<OrderResponseDto[]> {
    const userId = req.user.userId;
    return this.ordersService.findUserOrders(userId);
  }
}
