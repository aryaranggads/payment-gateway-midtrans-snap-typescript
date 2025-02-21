import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Module({
  providers: [PrismaService],
  exports: [PrismaService], // Wajib diexport agar bisa digunakan di module lain
})
export class PrismaModule {}
