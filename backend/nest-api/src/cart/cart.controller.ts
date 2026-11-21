// backend/nest-api/src/cart/cart.controller.ts

import {
  Controller,
  Post,
  Body,
  Get,
  Delete,
  Patch,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { ProductIdParamDto } from './dto/product-id-param.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post()
  addToCart(
    @Request() req: AuthenticatedRequest,
    @Body() addToCartDto: AddToCartDto,
  ) {
    const userId = req.user.userId; // read userId from jwt token
    return this.cartService.addToCart(userId, addToCartDto);
  }

  @Get()
  getCart(@Request() req: AuthenticatedRequest) {
    const userId = req.user.userId;
    return this.cartService.getCart(userId);
  }

  @Patch(':productId')
  setQuantity(
    @Request() req: AuthenticatedRequest,
    @Param() params: ProductIdParamDto,
    @Body() body: UpdateCartItemDto,
  ) {
    return this.cartService.setQuantity(
      req.user.userId,
      String(params.productId),
      body.quantity,
    );
  }

  @Delete(':productId')
  removeFromCart(
    @Request() req: AuthenticatedRequest,
    @Param() params: ProductIdParamDto,
  ) {
    const userId = req.user.userId;
    return this.cartService.removeFromCart(userId, String(params.productId));
  }
}
