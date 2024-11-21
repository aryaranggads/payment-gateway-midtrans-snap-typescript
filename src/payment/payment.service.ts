import { Injectable } from '@nestjs/common';
import * as midtransClient from 'midtrans-client';

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

  async createTransaction(transactionDto: any) {
    const parameter = {
      transaction_details: {
        order_id: transactionDto.orderId,
        gross_amount: transactionDto.amount,
      },
      credit_card: {
        secure: true,
      },
      item_details: transactionDto.itemDetails,
    };

    return await this.snap.createTransaction(parameter);
  }
}

