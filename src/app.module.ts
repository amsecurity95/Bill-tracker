import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { BillsModule } from './bills/bills.module';
import { ReminderModule } from './reminder/reminder.module';
import { Bill } from './bills/entities/bill.entity';
import { AiModule } from './ai/ai.module';
import { UiController } from './ui/ui.controller';

const databaseUrl =
  process.env.DATABASE_URL ||
  'postgresql://postgres:wWLdzVXfolLtvfNQDeqgdmEaUFAhstBy@shuttle.proxy.rlwy.net:24187/railway';
const shouldUseDatabaseSsl =
  process.env.DATABASE_SSL === 'true' ||
  (process.env.DATABASE_SSL !== 'false' &&
    !/(localhost|127\.0\.0\.1)/i.test(databaseUrl));

@Module({
  controllers: [UiController],
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: databaseUrl,
      entities: [Bill],
      synchronize: true,
      ssl: shouldUseDatabaseSsl ? { rejectUnauthorized: false } : false,
    }),
    ScheduleModule.forRoot(),
    BillsModule,
    ReminderModule,
    AiModule,
  ],
})
export class AppModule {}

