import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PaymentModule } from './payment/payment.module';
import { TransactionEntity } from './payment/transaction.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Memastikan config bisa diakses di semua module
      envFilePath: '.env', // Pastikan .env bisa dibaca
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USER', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'password'),
        database: configService.get<string>('DB_NAME', 'midtrans_payment'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'], // Ambil semua entity
        synchronize: false, // Gunakan migrasi, jangan sync otomatis
        migrations: [__dirname + '/database/migrations/*.ts'],
        autoLoadEntities: true,
      }),
      inject: [ConfigService],
    }),
    PaymentModule,
  ],
})
export class AppModule {}
