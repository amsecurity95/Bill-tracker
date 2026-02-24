import { IsString, IsNumber, IsDateString, IsEmail, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateBillDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  amount?: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  reminderEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  @IsOptional()
  @IsBoolean()
  isSuperImportant?: boolean;

  @IsOptional()
  @IsString()
  category?: string;
}

