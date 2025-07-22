// src/payment/payment.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PaymentService } from './payment.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('initiate')
  initiatePayment(
    @Request() req,
    @Body() initiatePaymentDto: InitiatePaymentDto,
  ) {
    const userId = req.user.userId;
    return this.paymentService.initiatePayment(
      initiatePaymentDto.orderId,
      userId,
    );
  }

  // این اندپوینت بازگشت از درگاه پرداخت را شبیه‌سازی می‌کند
  @Get('verify')
  verifyPayment(@Request() req, @Query() verifyDto: VerifyPaymentDto) {
    const userId = req.user.userId;
    return this.paymentService.verifyPayment(verifyDto, userId);
  }
}
