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

    const taxRate1 = 0.12;  // 11% PPN
    const taxRate2 = 0.05;  // 5% PJU
    const pricePerKwh = 2466;
    const admin_fee = 4000; // Admin fee tetap, tidak perlu dibulatkan
    
    let consumptionKwh: number;
    let baseAmount: number;
    
    if (transactionDto.isKwh) {
      // Jika transaksi berdasarkan jumlah kWh
      consumptionKwh = transactionDto.amount!; 
      baseAmount = consumptionKwh * pricePerKwh; // Hitung harga listrik dalam rupiah
    } else {
      // Jika transaksi berdasarkan rupiah, hitung ulang kWh
      baseAmount = (transactionDto.amount - admin_fee) / (1 + taxRate1 + taxRate2);
      consumptionKwh = parseFloat((baseAmount / pricePerKwh).toFixed(2));
    }
    
    // Pembulatan base amount sebelum pajak
    let roundedBaseAmount = Math.round(baseAmount);
    
    // Hitung pajak
    let roundedTaxAmount1 = Math.round(roundedBaseAmount * taxRate1);
    let roundedTaxAmount2 = Math.round(roundedBaseAmount * taxRate2);
    
    // Hitung total harga dalam rupiah (gunakan admin_fee langsung, tanpa pembulatan ulang)
    let grossAmount = roundedBaseAmount + roundedTaxAmount1 + roundedTaxAmount2 + admin_fee;
    
    // Pastikan grossAmount sesuai dengan jumlah yang ingin dibayar
    const expectedTotal = transactionDto.amount;
    let difference = expectedTotal - grossAmount;
    
    if (difference !== 0) {
      // Sesuaikan pajak atau base amount agar sesuai dengan expectedTotal
      if (Math.abs(difference) === 1) {
        roundedTaxAmount1 += difference;
      } else {
        roundedBaseAmount += difference;
      }
      grossAmount = roundedBaseAmount + roundedTaxAmount1 + roundedTaxAmount2 + admin_fee;
    }

    
   
    // Buat daftar item yang akan dikirim ke Midtrans
    const itemDetails = [
      {
        id: 'BASE_AMOUNT',
        name: (`${consumptionKwh} kWh Electricity Usage`),
        price: roundedBaseAmount,
        quantity: 1,
      },
      {
        id: 'ADMIN_FEE',
        name: 'Admin Fee',
        price: admin_fee,
        quantity: 1,
      },
      {
        id: 'TAX_11%',
        name: 'PPN 11%',
        price: roundedTaxAmount1,
        quantity: 1,
      },
      {
        id: 'TAX_5%',
        name: 'PJU 5%',
        price: roundedTaxAmount2,
        quantity: 1,
      },
    ];
    
    // Log transaksi
    this.logger.log('Perhitungan Transaksi');
    this.logger.log(`Base Amount (sebelum pajak): ${roundedBaseAmount}`);
    this.logger.log(`Tax 11%: ${roundedTaxAmount1}`);
    this.logger.log(`Tax 5%: ${roundedTaxAmount2}`);
    this.logger.log(`Admin Fee: ${admin_fee}`);
    this.logger.log(`Total yang dikirim ke Midtrans (termasuk pajak dan admin fee): ${grossAmount}`);
    
    // Data yang dikirim ke Midtrans
    const parameter = {
      transaction_details: {
        order_id: transactionDto.order_id,
        gross_amount: grossAmount,  // HANYA Base Amount + Pajak + Admin Fee
      },
      customer_details: {
        first_name: transactionDto.first_name,
        last_name: transactionDto.last_name,
        email: transactionDto.email,
        phone: transactionDto.phone,
      },
      item_details: itemDetails,  // Pajak dikirim ke Midtrans
      expiry: {
        unit: 'minutes',
        duration: 30,
      },
    };
    
    
    console.log("====== Final Data Sent to Midtrans ======");
    console.log(JSON.stringify(parameter, null, 2));
    
    const response = await this.snap.createTransaction(parameter);
    this.logger.log(`Midtrans response: ${JSON.stringify(response)}`);
    
    // Simpan ke database
    await this.prisma.transaction.create({
      data: {
        order_id: transactionDto.order_id,
        user_id: transactionDto.user_id,
        transaction_status: 'pending',
        gross_amount: grossAmount, // Tanpa pajak
        totalPricePower: baseAmount,
        totalPower: consumptionKwh,
        ppn: roundedTaxAmount1, // Pajak tetap dicatat
        pju: roundedTaxAmount2,
        adminFee: admin_fee,
        va_number: transactionDto.va_number|| 'unknown',
        payment_type: transactionDto.payment_type || 'unknown',
        transaction_time: new Date(),
      },
    });
    
    return response;
    
  }

  async getUserTransactions(userId: string, status?: string) {
    const whereCondition: any = { user_id: parseInt(userId, 10) };

    if (status) {
      whereCondition.transaction_status = status;
    }

    return await this.prisma.transaction.findMany({
      where: whereCondition, // Menggunakan kondisi dinamis
      select: { 
        id: true,
        order_id: true,
        user_id: true,
        transaction_time: true,
        transaction_status: true,
        payment_type: true,         // Pastikan ini ada
        va_number: true,       // Pastikan ini ada
        gross_amount: true,
        totalPricePower: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        transaction_time: "desc"
      }
    });
}

  async updateTransactionStatus(orderId: string, webhookDto: MidtransWebhookDto): Promise<void> {
    this.logger.log(`Updating transaction ${orderId} with status: ${webhookDto.transaction_status}`);
    this.logger.log(`Received webhook data: ${JSON.stringify(webhookDto, null, 2)}`);
    this.logger.log(`Webhook Data: ${JSON.stringify(webhookDto)}`);

    
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
        va_number: webhookDto.va_numbers?.[0]?.va_number || '',
        updatedAt: new Date(), 
      },
    });
    
  }
  
    verifySignature(orderId: string, statusCode: string, grossAmount: string, signatureKey: string): boolean {
    const serverKey = this.configService.get<string>('MIDTRANS_SERVER_KEY');
    if (!serverKey) {
        throw new Error('Server key is not configured.');
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
