import { toZonedTime, format } from 'date-fns-tz';

const TIMEZONE = 'America/Argentina/Buenos_Aires';

/**
 * Returns the current date (or provided date) in Argentina timezone.
 */
export const getArgentinaDate = (date: Date = new Date()): Date => {
    return toZonedTime(date, TIMEZONE);
};

/**
 * Returns the current date as a YYYY-MM-DD string in Argentina timezone.
 */
export const getTodayString = (): string => {
    return format(toZonedTime(new Date(), TIMEZONE), 'yyyy-MM-dd', { timeZone: TIMEZONE });
};

/**
 * Returns the start of the current week (Monday) in Argentina timezone as YYYY-MM-DD.
 */
// Start of week logic can be tricky with timezones. 
// We want the Monday of the current week in Argentina.
export const getWeekStartString = (): string => {
    const now = getArgentinaDate();
    const day = now.getDay(); // 0 (Sun) to 6 (Sat)
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(now.setDate(diff));
    return format(monday, 'yyyy-MM-dd', { timeZone: TIMEZONE });
};

/**
 * Returns the end of the current week (Sunday) in Argentina timezone as YYYY-MM-DD.
 */
export const getWeekEndString = (): string => {
    const now = getArgentinaDate();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? 0 : 7); // adjust when day is sunday
    const sunday = new Date(now.setDate(diff));
    return format(sunday, 'yyyy-MM-dd', { timeZone: TIMEZONE });
};
/**
 * Returns the time remaining in the current week (until Sunday midnight)
 * @returns { days: number, hours: number, minutes: number, totalMs: number }
 */
export const getTimeRemainingInWeek = () => {
    const now = getArgentinaDate();

    // Get next Monday 00:00:00
    const nextMonday = new Date(getWeekEndString());
    nextMonday.setDate(nextMonday.getDate() + 1);
    nextMonday.setHours(0, 0, 0, 0);

    const diff = nextMonday.getTime() - now.getTime();

    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, totalMs: 0 };

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return { days, hours, minutes, totalMs: diff };
};

/**
 * Returns the end of the current month in Argentina timezone as YYYY-MM-DD.
 */
export const getMonthEndString = (): string => {
    const now = getArgentinaDate();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return format(lastDay, 'yyyy-MM-dd', { timeZone: TIMEZONE });
};

/**
 * Returns the end of the current year in Argentina timezone as YYYY-MM-DD.
 */
export const getYearEndString = (): string => {
    const now = getArgentinaDate();
    const lastDay = new Date(now.getFullYear(), 11, 31);
    return format(lastDay, 'yyyy-MM-dd', { timeZone: TIMEZONE });
};

/**
 * Returns a far future date for milestones.
 */
export const getFarFutureString = (): string => {
    return '2099-12-31';
};
