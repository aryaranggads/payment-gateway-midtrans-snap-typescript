import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { PaymentModule } from './payment/payment.module';
import { PrismaModule } from './prisma.module'; // Import tanpa forRoot

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    PrismaModule, // Hapus PrismaModule.forRoot()
    PaymentModule,
  ],
})
export class AppModule {}
