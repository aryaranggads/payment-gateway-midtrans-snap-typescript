import { Controller, Post, Body, Get, HttpException, HttpStatus, Logger, Param } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { TransactionDto } from './payment.model';
import { ResponseStatus } from './response-status.enum';



@Controller('payment') // Root route "/payment"
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);
  

  constructor(private readonly paymentService: PaymentService) {}

  @Post('webhook')
  async handleWebhook(@Body() payload: TransactionDto) {
    this.logger.log('Webhook received from Midtrans', JSON.stringify(payload));

    try {
      // Proses payload notifikasi
      await this.paymentService.handleWebhookNotification(payload);

      return { status: 'success', message: 'Notification processed successfully' };
    } catch (error) {
      this.logger.error('Error processing webhook', error.message);

      throw new HttpException(
        { status: 'error', message: error.message || 'Failed to process notification' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('transaction/:orderId')
  async getTransactionByOrderId(@Param('orderId') orderId: string) {
    this.logger.log(`Fetching transaction for order_id: ${orderId}`);

    try {
      const transaction = await this.paymentService.getTransactionByOrderId(orderId);
      if (!transaction) {
        throw new HttpException(
          { status: 'error', message: 'Transaction not found' },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        status: 'success',
        data: transaction,
      };
    } catch (error) {
      this.logger.error(`Error fetching transaction for order_id: ${orderId}`, error.message);

      throw new HttpException(
        { status: 'error', message: error.message || 'Failed to fetch transaction' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

    

  @Post('transaction') // Endpoint menjadi "/payment/transaction"
  async createTransaction(@Body() createTransactionDto: TransactionDto) {
    this.logger.log('Received request to create transaction', createTransactionDto);
    try {
      // Panggil service untuk membuat transaksi
      const result = await this.paymentService.createTransaction(createTransactionDto);
      this.logger.log('Transaction successfully created', result);

      // Kembalikan hasil jika berhasil
      return {
        status: ResponseStatus.SUCCESS,
        data: result,
      };
    } catch (error) {
      this.logger.error('Error creating transaction', error.message);

      // Tangani error dan kembalikan response dengan status 500
      throw new HttpException(
        {
          status: ResponseStatus.ERROR,
          message: error.message || 'Something went wrong',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
