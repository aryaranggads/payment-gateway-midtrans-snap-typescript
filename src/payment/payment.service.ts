import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as midtransClient from 'midtrans-client';
import { PrismaService } from 'src/prisma.service';
import { ConfigService } from '@nestjs/config';
import { TransactionDto } from './payment.model';
import * as crypto from 'crypto';
import { MidtransWebhookDto } from './webhook.dto';

@Injectable()
export class PaymentService {
  private snap: midtransClient.Snap;
  private core: midtransClient.CoreApi;
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.snap = new midtransClient.Snap({
      isProduction: false,
      serverKey: this.configService.get<string>('MIDTRANS_SERVER_KEY'),
      clientKey: this.configService.get<string>('MIDTRANS_CLIENT_KEY'),
    });

    this.core = new midtransClient.CoreApi({
      isProduction: false,
      serverKey: this.configService.get<string>('MIDTRANS_SERVER_KEY'),
      clientKey: this.configService.get<string>('MIDTRANS_CLIENT_KEY'),
    });
  }

  async getPayments() {
    return await this.prisma.transaction.findMany();
  }

  async createTransaction(transactionDto: TransactionDto) {
    this.logger.log(`Creating transaction: ${JSON.stringify(transactionDto)}`);

    const existingTransaction = await this.prisma.transaction.findUnique({
      where: { order_id: transactionDto.order_id },
    });
    if (existingTransaction) {
      throw new Error(`Transaction with order ID ${transactionDto.order_id} already exists.`);
    }

    const taxRate1 = 0.12;
    const taxRate2 = 0.05;
    const pricePerKwh = 2466;
    const kwhPerRupiah = 1 / pricePerKwh;
    const admin_fee = 4000;
    let consumptionKwh: number;
    let baseAmount: number;

    if (transactionDto.isKwh) {
      consumptionKwh = transactionDto.amount!;
      baseAmount = consumptionKwh * pricePerKwh;
    } else {
      baseAmount = (transactionDto.amount! - admin_fee) / (1 + taxRate1 + taxRate2);
      consumptionKwh = baseAmount * kwhPerRupiah;
    }

    baseAmount = Math.round(baseAmount);
    const taxAmount1 = Math.round(baseAmount * taxRate1);
    const taxAmount2 = Math.round(baseAmount * taxRate2);
    const totalamount = baseAmount + taxAmount1 + taxAmount2 + admin_fee;


    const itemDetails = [
      { id: 'electricity', price: baseAmount, quantity: 1, name: `${consumptionKwh.toFixed(0)} kWh Usage` },
      { id: 'tax1', price: taxAmount1, quantity: 1, name: 'PPN 12%' },
      { id: 'tax2', price: taxAmount2, quantity: 1, name: 'PJU 5%' },
      { id: 'admin_fee', price: admin_fee, quantity: 1, name: 'Admin Fee' },
    ];

    const parameter = {
      transaction_details: {
        order_id: transactionDto.order_id,
        gross_amount: totalamount,
      },
      customer_details: {
        first_name: transactionDto.first_name,
        last_name: transactionDto.last_name,
        email: transactionDto.email,
        phone: transactionDto.phone,
      },
      item_details: itemDetails,
      expiry: {
        unit: 'minutes',
        duration: 30,
      },
    };

    const response = await this.snap.createTransaction(parameter);
    this.logger.log(`Midtrans response: ${JSON.stringify(response)}`);

    await this.prisma.transaction.create({
      data: {
        order_id: transactionDto.order_id,
        user_id: transactionDto.user_id,
        transaction_status: 'pending',
        gross_amount: totalamount,
        totalPricePower: baseAmount,
        totalPower: parseFloat(consumptionKwh.toFixed(2)),
        ppn: taxAmount1,
        pju: taxAmount2,
        adminFee: admin_fee,
        payment_type: transactionDto.payment_type || 'unknown',
        transaction_time: new Date(),
      },
    });

    return response;
  }

  async getUserTransactions(userId: string, status?: string) {
    const whereCondition: any = { user_id: userId };

    if (status) {
      whereCondition.transaction_status = status;
    }

    return await this.prisma.transaction.findMany({
      where: {
        user_id: parseInt("32", 10), // Konversi string ke integer
      },
      orderBy: {
        transaction_time: "desc"
      }
    });
  }
    


  async updateTransactionStatus(orderId: string, webhookDto: MidtransWebhookDto): Promise<void> {
    this.logger.log(`Updating transaction ${orderId} with status: ${webhookDto.transaction_status}`);

    const transaction = await this.prisma.transaction.findUnique({ where: { order_id: orderId } });
    if (!transaction) {
      this.logger.error(`Transaction with Order ID ${orderId} not found`);
      throw new Error(`Transaction with order ID ${orderId} not found`);
    }

    let paymentDetail = '';
    switch (webhookDto.payment_type) {
      case 'qris':
        paymentDetail = webhookDto.issuer || '';
        break;
      case 'bank_transfer':
        paymentDetail = webhookDto.va_numbers?.[0]?.bank || '';
        break;
      case 'credit_card':
        paymentDetail = webhookDto.bank || '';
        break;
      case 'alfamart':
        paymentDetail = 'Alfamart';
        break;
      case 'shopeepay':
        paymentDetail = 'ShopeePay';
        break;
      case 'gopay':
        paymentDetail = webhookDto.payment_option_type || '';
        break;
    }

    await this.prisma.transaction.update({
      where: { order_id: orderId },
      data: {
        transaction_status: webhookDto.transaction_status,
        payment_type: webhookDto.payment_type || '',
        payment_detail: paymentDetail,
        updatedAt: new Date(), 
      },
    });
    
  }

  
  verifySignature(orderId: string, statusCode: string, grossAmount: string, signatureKey: string): boolean {
    const serverKey = this.configService.get<string>('MIDTRANS_SERVER_KEY');
    if (!serverKey) {
      throw new Error('Server key is not configured');
    }
  
    const payload = `${orderId}${statusCode}${grossAmount}${serverKey}`;
    const calculatedSignature = crypto.createHash('sha512').update(payload).digest('hex');
  
    this.logger.log(`Verifying signature for order ${orderId}`);
    this.logger.debug(`Calculated signature: ${calculatedSignature}`);
    this.logger.debug(`Received signature: ${signatureKey}`);
  
    const isValid = calculatedSignature === signatureKey;
    this.logger.log(`Signature verification ${isValid ? 'successful' : 'failed'}`);
    
    return isValid;
  }

  async getTransactionStatus(orderId: string) {
    try {
      const response = await this.core.transaction.status(orderId);
      return response;
    } catch (error) {
      this.logger.error(`Error getting transaction status: ${error.message}`);
      throw error;
    }
  }

  async cancelTransaction(orderId: string) {
    try {
      const response = await this.core.transaction.cancel(orderId);
      
      // Update local transaction status
      await this.prisma.transaction.update({
        where: { order_id: orderId }, // Perbaikan dari orderId
        data: {
          transaction_status: 'cancel',
          updatedAt: new Date(),
        },
      });
      
      return response;
    } catch (error) {
      this.logger.error(`Error canceling transaction: ${error.message}`);
      throw error;
    }
  }
}