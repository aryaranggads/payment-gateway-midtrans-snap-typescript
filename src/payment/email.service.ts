import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'youremail@gmail.com',
        pass: 'yourpassword',
      },
    });
  }

  async sendInvoiceEmail(
    recipientEmail: string,
    invoiceData: any,
    status: string
  ) {
    const statusColor = status === 'pending' ? 'yellow' : status === 'paid' ? 'green' : 'red';

    const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd;">
        <h1 style="color: ${statusColor};">Invoice: ${invoiceData.order_id}</h1>
        <p>Status Pembayaran: <b>${status}</b></p>
        <p>Total: <b>${invoiceData.gross_amount}</b></p>
        <p>Metode Pembayaran: <b>${invoiceData.payment_type}</b></p>
        <p>Terima kasih telah menggunakan layanan kami!</p>
      </div>
    `;

    await this.transporter.sendMail({
      from: '"KedaiCas" <youremail@gmail.com>',
      to: recipientEmail,
      subject: `Invoice ${status.toUpperCase()}`,
      html: htmlTemplate,
    });
  }
}