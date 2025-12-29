import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { BillsModule } from './bills/bills.module';
import { ReminderModule } from './reminder/reminder.module';
import { Bill } from './bills/entities/bill.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL || 'postgresql://postgres:wWLdzVXfolLtvfNQDeqgdmEaUFAhstBy@shuttle.proxy.rlwy.net:24187/railway',
      entities: [Bill],
      synchronize: true,
      ssl: {
        rejectUnauthorized: false,
      },
    }),
    ScheduleModule.forRoot(),
    BillsModule,
    ReminderModule,
  ],
})
export class AppModule {}

