import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';

@Module({
  controllers: [PaymentController],
  providers: [PaymentService], // Daftarkan PaymentService sebagai provider
  exports: [PaymentService],   // Jika kamu ingin menggunakan PaymentService di luar module ini
})
export class PaymentModule {}
