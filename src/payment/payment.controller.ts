import { Controller, Post, Body, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { TransactionDto } from './payment.model';
import { ResponseStatus } from './response-status.enum';



@Controller('payment') // Root route "/payment"
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(private readonly paymentService: PaymentService) {}

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
