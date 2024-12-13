import { Injectable } from '@nestjs/common';
import * as midtransClient from 'midtrans-client';
import { TransactionDto } from './payment.model';

@Injectable()
export class PaymentService {
  private snap: midtransClient.Snap;

  constructor() {
    this.snap = new midtransClient.Snap({
      isProduction: false,
      serverKey: 'SB-Mid-server-1ZJk-ewVI6z85pSp1AN27Ifq',
      clientKey: 'SB-Mid-client-eVMjKqZA916uOVWD',
    });
  }

  // Fungsi untuk membulatkan ke angka genap terdekat
  private roundToEven(num: number): number {
    const rounded = Math.round(num);
    return rounded % 2 === 0 ? rounded : rounded + 1;
  }

  async createTransaction(transactionDto: TransactionDto) {
    const taxRate1 = 0.11; // PPN 11%
    const taxRate2 = 0.05; // PJU 5%
    const pricePerKwh = 2466; // Harga 1 kWh
    const kwhPerRupiah = 1 / pricePerKwh; // Konversi 1 Rupiah ke kWh
  
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
  
    baseAmount = Math.round(baseAmount); // Pembulatan base amount
    const taxAmount1 = Math.round(baseAmount * taxRate1);
    const taxAmount2 = Math.round(baseAmount * taxRate2);
  
    const totalAmount = baseAmount + taxAmount1 + taxAmount2;
  
    transactionDto.itemDetails = [
      {
        id: 'electricity',
        price: baseAmount,
        quantity: 1,
        name: `${consumptionKwh.toFixed(0)} kWh Usage`, // Dibulatkan ke angka bulat
      },
      {
        id: 'tax1',
        price: taxAmount1,
        quantity: 1,
        name: 'PPN 11%',
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
        order_id: transactionDto.orderId,
        gross_amount: totalAmount,
      },
      customer_details: {
        first_name: transactionDto.first_name,
        last_name: transactionDto.last_name,
        email: transactionDto.email,
        phone: transactionDto.phone,
      },
      credit_card: {
        secure: true,
      },
      item_details: transactionDto.itemDetails,
    };
  
    return await this.snap.createTransaction(parameter);
  }
}  