import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PrismaModule } from 'src/prisma.module';
import { PrismaService } from 'src/prisma.service';

@Module({
  imports: [
    PrismaModule, 
  ],
  controllers: [PaymentController],
  providers: [PaymentService, PrismaService],
  exports: [PaymentService],
})
export class PaymentModule {}
