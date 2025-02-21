import { IsNotEmpty, IsNumber, IsString, IsOptional, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

class VANumberDto {
  @IsString()
  @IsNotEmpty()
  bank: string;

  @IsString()
  @IsNotEmpty()
  va_number: string;
}

export class MidtransWebhookDto {
  @IsString()
  @IsNotEmpty()
  order_id: string;

  @IsNumber()
  @IsNotEmpty()
  gross_amount: number;

  @IsString()
  @IsNotEmpty()
  transaction_status: string;

  @IsString()
  @IsOptional()
  payment_type?: string;

  @IsString()
  @IsOptional()
  issuer?: string;

  @IsString()
  @IsOptional()
  payment_option_type?: string;

  @IsString()
  @IsNotEmpty()
  signature_key: string;

  @IsString()
  @IsNotEmpty()
  store: string;

  @IsString()
  @IsNotEmpty()
  acquirer: string;
  
  @IsString()
  @IsNotEmpty()
  bank: string;

  @IsString()
  @IsNotEmpty()
  transaction_time: string;

  @IsString()
  @IsNotEmpty()
  status_code: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VANumberDto)
  va_numbers: VANumberDto[];
}
