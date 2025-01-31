import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule'; // Cron Job
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PaymentModule } from './payment/payment.module';
import { TransactionEntity } from './payment/transaction.entity';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ScheduleModule.forRoot(), // Inisialisasi Cron Job
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      database: 'midtrans_payment',
      entities: [TransactionEntity],
      synchronize: true,
    }),
    PaymentModule,
  ],
})
export class AppModule {}
