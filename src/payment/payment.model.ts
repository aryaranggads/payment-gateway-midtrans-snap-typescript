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
  @IsOptional() // Changed to optional as it might not always be provided
  isKwh?: boolean;

  @IsNumber()
  @Min(1, { message: 'Amount must be greater than 0' })
  @IsOptional() // Changed to optional as it might not always be provided
  amount?: number;

  @IsOptional()
  itemDetails?: Array<{
    id: string;
    price: number;
    quantity: number;
    name: string;
  }>;
}
