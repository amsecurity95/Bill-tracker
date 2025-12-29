// Reminder routes
// Note: In NestJS, scheduled tasks are handled by @Cron decorators
// This file is provided for reference/documentation purposes

/**
 * Reminder System:
 * 
 * The reminder system runs automatically using @nestjs/schedule
 * - Daily cron job checks for upcoming bills
 * - Sends email reminders at 7 days, 3 days, and 1 day before due date
 * 
 * See: src/reminder/reminder.service.ts
 */

module.exports = {
  // Scheduled tasks are defined in NestJS services, not here
  // See: src/reminder/reminder.service.ts
};

