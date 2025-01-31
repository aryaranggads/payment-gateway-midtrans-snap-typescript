import { Injectable } from '@nestjs/common';
import * as midtransClient from 'midtrans-client';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionDto } from './payment.model';
import { TransactionEntity } from './transaction.entity';
import { Cron } from '@nestjs/schedule'; 
import { ConfigService } from '@nestjs/config';

type NewType = Repository<TransactionEntity>;

@Injectable()
export class PaymentService {
  private snap: midtransClient.Snap;
  private core: midtransClient.CoreApi;

  constructor(
    @InjectRepository(TransactionEntity)
    private transactionRepository: NewType,
    private configService: ConfigService,
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

  // Membulatkan angka ke bilangan genap terdekat
  private roundToEven(num: number): number {
    const rounded = Math.round(num);
    return rounded % 2 === 0 ? rounded : rounded + 1;
  }

  // Membuat transaksi
  async createTransaction(transactionDto: TransactionDto) {
    // Validasi bahwa user_id ada
    if (!transactionDto.user_id) {
      throw new Error('User ID is required and must be unique.');
    }
  
    // Periksa apakah user_id sudah ada di database (harus unik)
    const existingTransaction = await this.transactionRepository.findOne({
      where: { user_id: transactionDto.user_id },
    });
  
    if (existingTransaction) {
      throw new Error('User ID must be unique. A transaction with this user_id already exists.');
    }
  
    const taxRate1 = 0.12; // PPN 12%
    const taxRate2 = 0.05; // PJU 5%
    const pricePerKwh = 2466; // Harga per kWh
    const kwhPerRupiah = 1 / pricePerKwh;
  
    let consumptionKwh: number;
    let baseAmount: number;
  
    // Validasi input
    if (transactionDto.isKwh === undefined || transactionDto.amount === undefined) {
      throw new Error('Both isKwh and amount must be provided');
    }
  
    if (transactionDto.isKwh) {
      if (transactionDto.amount <= 0) {
        throw new Error('Amount in kWh must be greater than 0');
      }
      consumptionKwh = transactionDto.amount;
      baseAmount = consumptionKwh * pricePerKwh;
    } else {
      if (transactionDto.amount <= 0) {
        throw new Error('Amount in Rupiah must be greater than 0');
      }
  
      const totalAmount = transactionDto.amount;
      baseAmount = totalAmount / (1 + taxRate1 + taxRate2);
      consumptionKwh = baseAmount * kwhPerRupiah;
    }
  
    baseAmount = Math.round(baseAmount);
    const taxAmount1 = Math.round(baseAmount * taxRate1);
    const taxAmount2 = Math.round(baseAmount * taxRate2);
    const totalAmount = baseAmount + taxAmount1 + taxAmount2;
  
    transactionDto.itemDetails = [
      {
        id: 'electricity',
        price: baseAmount,
        quantity: 1,
        name: `${consumptionKwh.toFixed(0)} kWh Usage`,
      },
      {
        id: 'tax1',
        price: taxAmount1,
        quantity: 1,
        name: 'PPN 12%',
      },
      {
        id: 'tax2',
        price: taxAmount2,
        quantity: 1,
        name: 'PJU 5%',
      },
    ];
  
    const parameter = {
      transaction_details: {
        order_id: transactionDto.order_id,
        gross_amount: totalAmount,
      },
      customer_details: {
        first_name: transactionDto.first_name,
        last_name: transactionDto.last_name,
        email: transactionDto.email,
        phone: transactionDto.phone,
      },
      expiry: {
        unit: "hour",
        duration: 2,
      },
      credit_card: {
        secure: true,
      },
      item_details: transactionDto.itemDetails,
    };
  
    console.log('Payload to Midtrans:', JSON.stringify(parameter, null, 2));
    console.log('User ID being saved:', transactionDto.user_id);

  
    // Buat transaksi di Midtrans
    const response = await this.snap.createTransaction(parameter);
  
    // Simpan data transaksi ke database
    const transaction = new TransactionEntity();
    transaction.order_id = transactionDto.order_id;
    transaction.transaction_status = 'pending';
    transaction.payment_type = 'undefined';
    transaction.gross_amount = parameter.transaction_details.gross_amount;
    transaction.ppn = taxAmount1; // Simpan PPN
    transaction.pju = taxAmount2; // Simpan PJU
    transaction.transaction_time = new Date();
    transaction.user_id = transactionDto.user_id; // Simpan user_id yang unik
  
    await this.transactionRepository.save(transaction);
  
    return response;
  }
  
  // Mengecek status transaksi di Midtrans
  async checkTransactionStatus(orderId: string) {
    try {
      const statusResponse = await this.core.transaction.status(orderId);
  
      // Update status transaksi di database
      const transaction = await this.transactionRepository.findOne({
        where: { order_id: orderId },
      });

      
  
      if (transaction) {
        transaction.transaction_status = statusResponse.transaction_status;
        transaction.payment_type = statusResponse.payment_type || transaction.payment_type;
  
        // Tangkap detail metode pembayaran berdasarkan tipe pembayaran
        let paymentDetail = null;
        switch (statusResponse.payment_type) {
          case 'bank_transfer':
            paymentDetail = statusResponse.va_numbers?.[0]?.bank || 'Bank Transfer';
            break;
          case 'qris':
            paymentDetail = statusResponse.acquirer
              ? `QRIS (${statusResponse.acquirer})`
              : 'QRIS Payment';
            break;
          case 'gopay':
            paymentDetail = 'GoPay';
            break;
          case 'shopeepay':
            paymentDetail = 'ShopeePay';
            break;
          case 'credit_card':
            paymentDetail = `Credit Card (${statusResponse.masked_card || 'Unknown Card'})`;
            break;
          case 'cstore':
            paymentDetail = `Convenience Store: ${statusResponse.store}`;
            break;
          default:
            paymentDetail = 'Other Payment Method';
            break;
        }
  
        transaction.payment_detail = paymentDetail;
        transaction.gross_amount = statusResponse.gross_amount || transaction.gross_amount;
        transaction.transaction_time = new Date(statusResponse.transaction_time || transaction.transaction_time);
  
        // Simpan status baru ke database
        await this.transactionRepository.save(transaction);
      }
  
      return statusResponse;
    } catch (error) {
      console.error(`Error checking status for order ID ${orderId}:`, error.message);
      throw error;
    }
  }
  
  // Polling otomatis untuk transaksi pending
  @Cron('* * * * *')
async pollTransactions() {
  const batchSize = 10; // Batasi jumlah transaksi yang diperiksa per iterasi
  let offset = 0; // Awal dari transaksi yang diambil

  let pendingTransactions: TransactionEntity[];

  do {
    // Ambil batch transaksi pending dari database
    pendingTransactions = await this.transactionRepository.find({
      where: { transaction_status: 'pending' },
      take: batchSize,
      skip: offset,
    });

    // Proses setiap transaksi dalam batch
    for (const transaction of pendingTransactions) {
      try {
        const statusResponse = await this.checkTransactionStatus(transaction.order_id);
        console.log(`Updated status for order ID ${transaction.order_id}:`, statusResponse.transaction_status);
      } catch (error) {
        console.error(`Failed to update status for order ID ${transaction.order_id}:`, error.message);
      }
    }

    offset += batchSize; // Perbarui offset untuk batch berikutnya
  } while (pendingTransactions.length > 0); // Lanjutkan jika masih ada transaksi
}
}
