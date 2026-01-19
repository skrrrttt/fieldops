import type { RecurrenceRule } from '@/lib/database.types';

/**
 * Calculate the next generation date based on recurrence rule
 */
export function calculateNextGenerationDate(
  rule: RecurrenceRule,
  fromDate: Date = new Date()
): Date {
  const next = new Date(fromDate);

  // Set the time if specified
  if (rule.time) {
    const [hours, minutes] = rule.time.split(':').map(Number);
    next.setHours(hours, minutes, 0, 0);
  } else {
    // Default to 9:00 AM
    next.setHours(9, 0, 0, 0);
  }

  switch (rule.frequency) {
    case 'daily':
      next.setDate(next.getDate() + (rule.interval || 1));
      break;

    case 'weekly':
      // Find the next occurrence on specified days
      if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        const currentDay = next.getDay();
        const sortedDays = [...rule.daysOfWeek].sort((a, b) => a - b);

        // Find next day in current week
        const nextDayInWeek = sortedDays.find(d => d > currentDay);

        if (nextDayInWeek !== undefined) {
          next.setDate(next.getDate() + (nextDayInWeek - currentDay));
        } else {
          // Move to first day of next week
          const daysUntilNextWeek = 7 - currentDay + sortedDays[0];
          next.setDate(next.getDate() + daysUntilNextWeek);
        }
      } else {
        // Default: same day next week
        next.setDate(next.getDate() + 7);
      }
      break;

    case 'biweekly':
      next.setDate(next.getDate() + 14);
      break;

    case 'monthly':
      next.setMonth(next.getMonth() + (rule.interval || 1));
      if (rule.dayOfMonth) {
        // Handle months with fewer days
        const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
        next.setDate(Math.min(rule.dayOfMonth, lastDay));
      }
      break;

    case 'custom':
      // Custom uses interval as days
      next.setDate(next.getDate() + (rule.interval || 1));
      break;
  }

  return next;
}
