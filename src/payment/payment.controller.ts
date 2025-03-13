import { Controller, Param, Post, Query, Get, Body, Logger, HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { TransactionDto } from './payment.model';
import { MidtransWebhookDto } from './webhook.dto';
import { PrismaService } from 'src/prisma.service';

@Controller('payment')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(
    private readonly paymentService: PaymentService,
    private readonly prisma: PrismaService 
  ) {}

  @Post('transaction')
  async createTransaction(@Body() createTransactionDto: TransactionDto) {
    try {
      this.logger.log(`Request to create transaction: ${JSON.stringify(createTransactionDto)}`);
      const result = await this.paymentService.createTransaction(createTransactionDto);
      this.logger.log(`Transaction created successfully: ${JSON.stringify(result)}`);
      return { status: 'SUCCESS', data: result };
    } catch (error) {
      this.logger.error(`Error creating transaction: ${error.message}`);
      throw new HttpException(
        { status: 'ERROR', message: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('transaction-status/:order_id')
  async getTransactionStatus(@Param('order_id') orderId: string) {
    return this.paymentService.getTransactionStatus(orderId);
  }


  @Get('history/:user_id')
  async getTransactionHistory(
    @Param('user_id') userId: string,
    @Query('status') status?: string
  ) {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }
  
    try {
      const transactions = await this.paymentService.getUserTransactions(userId, status);
      return { status: 'SUCCESS', data: transactions };
    } catch (error) {
      this.logger.error(`Error fetching transaction history: ${error.message}`);
      throw new HttpException(
        { status: 'ERROR', message: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('history/:user_id/pending')
async getPendingTransactions(@Param('user_id') userId: string) {
  if (!userId) {
    throw new BadRequestException('User ID is required');
  }

  try {
    const transactions = await this.paymentService.getUserTransactions(userId, 'pending');
    return { status: 'SUCCESS', data: transactions };
  } catch (error) {
    this.logger.error(`Error fetching pending transaction history: ${error.message}`);
    throw new HttpException(
      { status: 'ERROR', message: error.message },
      HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  } 
  
  @Post('webhook')
  async handleWebhook(@Body() webhookDto: MidtransWebhookDto): Promise<any> {
    this.logger.log(`Received Webhook: ${JSON.stringify(webhookDto)}`);
  
    if (!webhookDto.order_id) {
      this.logger.error('Missing order_id in webhook payload');
      throw new BadRequestException('Invalid webhook payload');
    }
  
    try {
      // Verifikasi signature
      const isSignatureValid = this.paymentService.verifySignature(
        webhookDto.order_id,
        webhookDto.status_code,
        webhookDto.gross_amount.toString(),
        webhookDto.signature_key,
      );

      if (!isSignatureValid) {
        this.logger.warn('Invalid signature detected');
        throw new BadRequestException('Invalid signature');
      }

      // Update transaksi
      this.logger.log(`Updating transaction status for Order ID: ${webhookDto.order_id}`);
      await this.paymentService.updateTransactionStatus(webhookDto.order_id, webhookDto);
      this.logger.log(`Transaction updated successfully: ${JSON.stringify(webhookDto)}`);

      return { message: 'Webhook processed successfully' };
    } catch (error) {
      this.logger.error(`Error processing webhook: ${error.message}`);
      throw new HttpException(
        { status: 'ERROR', message: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}