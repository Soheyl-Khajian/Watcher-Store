// backend/nest-api/src/cart/cart.controller.ts

import {
  Controller,
  Post,
  Body,
  Get,
  Delete,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { ProductIdParamDto } from './dto/product-id-param.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post()
  addToCart(@Request() req: any, @Body() addToCartDto: AddToCartDto) {
    const userId = req.user.userId; // read userId from jwt token
    return this.cartService.addToCart(userId, addToCartDto);
  }

  @Get()
  getCart(@Request() req: any) {
    const userId = req.user.userId;
    return this.cartService.getCart(userId);
  }

  @Delete(':productId')
  removeFromCart(@Request() req: any, @Param() params: ProductIdParamDto) {
    const userId = req.user.userId;
    return this.cartService.removeFromCart(userId, String(params.productId));
  }
}
