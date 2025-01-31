import { Injectable } from '@nestjs/common';
import * as midtransClient from 'midtrans-client';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionDto } from './payment.model';
import { TransactionEntity } from './transaction.entity';
import { ConfigService } from '@nestjs/config'; 
import { PaymentController } from './payment.controller';


@Injectable()
export class PaymentService {
  private snap: midtransClient.Snap;
  private core: midtransClient.CoreApi;

  constructor(
    @InjectRepository(TransactionEntity)
    private transactionRepository: Repository<TransactionEntity>,
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

  private roundToEven(num: number): number {
    const rounded = Math.round(num);
    return rounded % 2 === 0 ? rounded : rounded + 1;
  }

  async createTransaction(transactionDto: TransactionDto) {
    if (!transactionDto.user_id) {
      throw new Error('User ID is required and must be unique.');
    }

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

    const response = await this.snap.createTransaction(parameter);

    const transaction = new TransactionEntity();
    transaction.order_id = transactionDto.order_id;
    transaction.transaction_status = 'pending';
    transaction.payment_type = 'undefined';
    transaction.gross_amount = parameter.transaction_details.gross_amount;
    transaction.ppn = taxAmount1;
    transaction.pju = taxAmount2;
    transaction.transaction_time = new Date();
    transaction.user_id = transactionDto.user_id;

    await this.transactionRepository.save(transaction);

    console.log('Transaction created successfully', response);
    return { 
      response,
      transaction: {
        order_id: transaction.order_id,
        user_id: transaction.user_id,
        transaction_status: transaction.transaction_status,
        payment_type: transaction.payment_type,
        gross_amount: transaction.gross_amount,
        ppn: transaction.ppn,
        pju: transaction.pju,
        transaction_time: transaction.transaction_time,
     },
    };
  }

  async checkTransactionStatus(orderId: string) {
    try {
      const statusResponse = await this.core.transaction.status(orderId);

      const transaction = await this.transactionRepository.findOne({
        where: { order_id: orderId },
      });

      if (transaction) {
        transaction.transaction_status = statusResponse.transaction_status;
        transaction.payment_type = statusResponse.payment_type || transaction.payment_type;
        transaction.gross_amount = statusResponse.gross_amount || transaction.gross_amount;
        transaction.transaction_time = new Date(statusResponse.transaction_time || transaction.transaction_time);

        await this.transactionRepository.save(transaction);
      }

      return { status: 'success',
        message: 'Transaction created successfully',
        data: {
        
          order_id: transaction.order_id,
          user_id: transaction.user_id,
          transaction_status: transaction.transaction_status,
          payment_type: transaction.payment_type,
          gross_amount: transaction.gross_amount,
          ppn: transaction.ppn,
          pju: transaction.pju,
          transaction_time: transaction.transaction_time,
       },
      };
    } catch (error) {
      throw error;
    }
  }
  async handleWebhookNotification(payload: any) {
    const {
      order_id,
      transaction_status,
      payment_type,
      gross_amount,
      transaction_time,
      acquirer,
  
       // Ambil acquirer dari payload Midtrans
    } = payload;
  
    const transaction = await this.transactionRepository.findOne({
      where: { order_id: order_id },
    });
  
    if (!transaction) {
      console.error(`Transaction with order ID ${order_id} not found.`);
      return;
    }
  
    transaction.transaction_status = transaction_status;
    transaction.payment_type = payment_type;
    transaction.gross_amount = gross_amount;
    transaction.transaction_time = new Date(transaction_time);
    transaction.payment_detail = acquirer || null; // Simpan acquirer sebagai payment_detail
   
  
  }
  async getTransactionByOrderId(orderId: string): Promise<TransactionEntity | null> {
    return this.transactionRepository.findOne({
      where: { order_id: orderId },
    });
  }
  
}

