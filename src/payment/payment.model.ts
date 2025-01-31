import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Min, MaxLength } from 'class-validator';

export class TransactionDto {
  @IsString()
  @IsNotEmpty()
  order_id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255, { message: 'User ID cannot exceed 255 characters' })
  user_id: string;

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

  @IsNumber()
  @Min(1, { message: 'Amount must be greater than 0' })
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsNumber()
  @Min(1, { message: 'Duration must be at least 1' })
  @IsOptional()
  duration?: number;

  @IsOptional()
  itemDetails?: Array<{
    id: string;
    price: number;
    quantity: number;
    name: string;
  }>;
}
