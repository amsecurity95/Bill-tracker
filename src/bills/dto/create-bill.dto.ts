import { IsString, IsNumber, IsDateString, IsEmail, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBillDto {
  @IsString()
  title: string;

  @IsNumber()
  @Type(() => Number)
  amount: number;

  @IsDateString()
  dueDate: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  reminderEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  isSuperImportant?: boolean;

  @IsOptional()
  @IsString()
  category?: string;
}

