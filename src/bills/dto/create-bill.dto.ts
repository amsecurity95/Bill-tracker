import { IsString, IsNumber, IsDateString, IsEmail, IsOptional, IsBoolean } from 'class-validator';

export class CreateBillDto {
  @IsString()
  title: string;

  @IsNumber()
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

