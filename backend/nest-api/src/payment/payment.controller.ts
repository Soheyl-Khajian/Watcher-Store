// backend/nest-api/src/payment/payment.controller.ts

import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { env } from '../env';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PaymentCallbackDto } from './dto/payment-callback.dto';
import { PaymentService } from './payment.service';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('initiate')
  initiatePayment(
    @Request() req: AuthenticatedRequest,
    @Body() initiatePaymentDto: InitiatePaymentDto,
  ) {
    return this.paymentService.initiatePayment(
      initiatePaymentDto.orderId,
      req.user.userId,
    );
  }

  // The gateway sends the customer's browser here after paying. Public: the
  // browser carries no API token, and nothing from the request is trusted.
  // The payment is verified with the gateway, server to server, and the
  // customer is sent on to the storefront, which shows the order's status.
  @Get('callback')
  async callback(
    @Query() query: PaymentCallbackDto,
    @Res() res: Response,
  ): Promise<void> {
    const orderId = await this.paymentService.handleCallback(
      query.Authority,
      query.Status,
    );

    const result = new URL(`${env.FRONTEND_URL}/payment/verify`);
    if (orderId !== null) {
      result.searchParams.set('orderId', String(orderId));
    }
    res.redirect(302, result.toString());
  }
}
