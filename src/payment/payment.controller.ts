import { Controller, Post, Body, Logger, HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { TransactionDto } from './payment.model';
import { MidtransWebhookDto } from './webhook.dto';
import { or } from 'drizzle-orm';

@Controller('payment')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);
  private requestBody: TransactionDto | null = null;
  private webhookDto: MidtransWebhookDto | null = null;
  private result:any;

  constructor(private readonly paymentService: PaymentService) {}

  @Post('transaction')
  async createTransaction(@Body() createTransactionDto: TransactionDto) {
    try {
      this.logger.log(`Request to create transaction: ${JSON.stringify(createTransactionDto)}`);
      this.requestBody = createTransactionDto;
      this.logger.log(`Request to create transaction: ${JSON.stringify(this.requestBody)}`);
       this.result = await this.paymentService.createTransaction(createTransactionDto);
      this.logger.log(`Result: ${JSON.stringify(this.result)}`);
      return { status: 'SUCCESS', data: this.result };
    } catch (error) {
      this.logger.error(`Error creating transaction: ${error.message}`);
      throw new HttpException(
        { status: 'ERROR', message: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('webhook')
  async handleWebhook(@Body() webhookDto: MidtransWebhookDto): Promise<any> {
    this.logger.log(`Received Webhook: ${JSON.stringify(webhookDto)}`);
    this.webhookDto = webhookDto;
  
    // Cek apakah order_id ada
    if (!webhookDto.order_id) {
      this.logger.error('Missing order_id in webhook payload');
      throw new BadRequestException('Invalid webhook payload');
    }
  
    // Verifikasi signature
    const isSignatureValid = this.paymentService.verifySignature(
      this.requestBody.order_id,
      this.webhookDto.status_code,
      this.webhookDto.gross_amount.toString(),
      this.webhookDto.signature_key,
    );
  
    if (!isSignatureValid) {
      this.logger.warn('Invalid signature detected');
      throw new BadRequestException('Invalid signature');
    }
  
    // Log sebelum update transaksi
    this.logger.log(`Updating transaction status for Order ID: ${webhookDto.order_id}`);
  
    // Update transaksi
    await this.paymentService.updateTransactionStatus(webhookDto.order_id, webhookDto);
  
    this.logger.log(`Transaction updated: ${JSON.stringify(webhookDto)}`);
  
    return { message: 'Webhook processed successfully' };
  }
}  