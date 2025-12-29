import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BillsService } from '../bills/bills.service';
import { EmailService } from './email.service';

@Injectable()
export class ReminderService {
  constructor(
    private billsService: BillsService,
    private emailService: EmailService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkAndSendReminders() {
    console.log('Checking for upcoming bills...');
    const upcomingBills = await this.billsService.findUpcomingBills(7);

    for (const bill of upcomingBills) {
      const daysUntilDue = this.getDaysUntilDue(bill.dueDate);
      
      // Send reminder if due in 7, 3, or 1 day(s)
      if (daysUntilDue === 7 || daysUntilDue === 3 || daysUntilDue === 1) {
        await this.emailService.sendReminderEmail(bill);
        console.log(`Reminder sent for bill: ${bill.title}`);
      }
    }
  }

  private getDaysUntilDue(dueDate: Date): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
}

