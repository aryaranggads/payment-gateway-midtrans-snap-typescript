import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Min, MaxLength } from 'class-validator';

export class TransactionDto {
  @IsString()
  @IsNotEmpty()
  order_id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255, { message: 'User ID cannot exceed 255 characters' })
  user_id:  number;

  @IsString()
  @IsNotEmpty()
  first_name: string;

  @IsString()
  @IsOptional()
  last_name?: string;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsBoolean()
  @IsOptional()
  isKwh?: boolean;

  payment_type?:  | 'bank_transfer' | 'credit_card' | 'alfamart' | 'shopeepay' | 'gopay' | 'alfamart'| 'indomaret';

  @IsBoolean()
  @IsOptional()
  va_number?: string;

  @IsNumber()
  @Min(1, { message: 'Amount must be greater than 0' })
  @IsOptional()
  amount?: number;

  @IsOptional()
  itemDetails?: Array<{
    id: string;
    price: number;
    quantity: number;
    name: string;
  }>;
}
