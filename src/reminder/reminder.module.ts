import { Module } from '@nestjs/common';
import { ReminderService } from './reminder.service';
import { EmailService } from './email.service';
import { BillsModule } from '../bills/bills.module';

@Module({
  imports: [BillsModule],
  providers: [ReminderService, EmailService],
})
export class ReminderModule {}

