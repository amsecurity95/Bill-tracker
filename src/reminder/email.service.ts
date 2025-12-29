import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Bill } from '../bills/entities/bill.entity';

@Injectable()
export class EmailService {
  private transporter;

  constructor() {
    // Using Gmail SMTP - you can configure this with your email
    // For production, use environment variables
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-app-password',
      },
    });
  }

  async sendReminderEmail(bill: Bill): Promise<void> {
    const daysUntilDue = this.getDaysUntilDue(bill.dueDate);
    const dueDateStr = new Date(bill.dueDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const subject = `💰 Bill Reminder: ${bill.title} - Due in ${daysUntilDue} day(s)`;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .bill-card { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .amount { font-size: 32px; font-weight: bold; color: #667eea; margin: 10px 0; }
            .due-date { color: #666; margin: 10px 0; }
            .footer { text-align: center; margin-top: 20px; color: #999; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💰 Bill Reminder</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>This is a friendly reminder that you have a bill coming up:</p>
              <div class="bill-card">
                <h2>${bill.title}</h2>
                <div class="amount">$${bill.amount.toFixed(2)}</div>
                <div class="due-date">📅 Due Date: ${dueDateStr}</div>
                ${bill.description ? `<p>${bill.description}</p>` : ''}
              </div>
              <p><strong>This bill is due in ${daysUntilDue} day(s)!</strong></p>
              <p>Don't forget to pay it on time to avoid any late fees.</p>
            </div>
            <div class="footer">
              <p>This is an automated reminder from Bill App</p>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_USER || 'your-email@gmail.com',
        to: bill.email,
        subject,
        html,
      });
      console.log(`Email sent successfully to ${bill.email}`);
    } catch (error) {
      console.error('Error sending email:', error);
      // Don't throw - we don't want email failures to crash the app
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

