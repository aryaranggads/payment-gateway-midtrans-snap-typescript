import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PaymentModule } from './payment/payment.module';
import { drizzle } from 'drizzle-orm/mysql2';
//import { DatabaseModule } from './database/database.module';

@Module({
  imports: [PaymentModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
