import { Controller, Post, Body } from '@nestjs/common';
import { Request, Response } from 'express';
import { PaymentService } from './payment.service';
import { TransactionDto } from './payment.model';


@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create-transaction')
  async createTransaction(@Body() createTransactionDto: TransactionDto) {
    return this.paymentService.createTransaction(createTransactionDto);
  }
}

