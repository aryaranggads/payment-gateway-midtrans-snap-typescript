import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentService } from './payment.service';
import { TransactionEntity } from './transaction.entity';
import { PaymentController } from './payment.controller';
import { PrismaModule } from 'src/prisma.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TransactionEntity]), // Import repository
    PrismaModule // Hapus ConfigModule
  ],
  providers: [PaymentService],
  exports: [PaymentService],
  controllers: [PaymentController],
})
export class PaymentModule {}
