// Balance calculation service - Pure logic
import { DailyRecord, Balance } from '../types';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from 'date-fns';

export class BalanceCalculator {
    /**
     * Calculate total balance from a list of records
     * @param records - Array of daily records
     * @returns Total points and time gained
     */
    static calculateTotal(records: DailyRecord[]): { totalPoints: number; timeGainedMinutes: number } {
        const totalPoints = records.reduce((sum, record) => sum + record.pointsCalculated, 0);
        const timeGainedMinutes = totalPoints; // 1 point = 1 minute

        return { totalPoints, timeGainedMinutes };
    }

    /**
     * Calculate daily balance for a specific date
     * @param records - All records
     * @param date - Target date
     * @returns Daily balance
     */
    static getDailyBalance(records: DailyRecord[], date: Date): Balance {
        const start = startOfDay(date);
        const end = endOfDay(date);

        const dayRecords = records.filter(r => {
            const recordDate = parseISO(r.date);
            return recordDate >= start && recordDate <= end;
        });

        const { totalPoints, timeGainedMinutes } = this.calculateTotal(dayRecords);

        return {
            periodType: 'daily',
            periodStart: start.toISOString(),
            periodEnd: end.toISOString(),
            totalPoints,
            timeGainedMinutes,
        };
    }

    /**
     * Calculate weekly balance
     * @param records - All records
     * @param date - Any date within the target week
     * @returns Weekly balance
     */
    static getWeeklyBalance(records: DailyRecord[], date: Date): Balance {
        const start = startOfWeek(date);
        const end = endOfWeek(date);

        const weekRecords = records.filter(r => {
            const recordDate = parseISO(r.date);
            return recordDate >= start && recordDate <= end;
        });

        const { totalPoints, timeGainedMinutes } = this.calculateTotal(weekRecords);

        return {
            periodType: 'weekly',
            periodStart: start.toISOString(),
            periodEnd: end.toISOString(),
            totalPoints,
            timeGainedMinutes,
        };
    }

    /**
     * Calculate monthly balance
     * @param records - All records
     * @param date - Any date within the target month
     * @returns Monthly balance
     */
    static getMonthlyBalance(records: DailyRecord[], date: Date): Balance {
        const start = startOfMonth(date);
        const end = endOfMonth(date);

        const monthRecords = records.filter(r => {
            const recordDate = parseISO(r.date);
            return recordDate >= start && recordDate <= end;
        });

        const { totalPoints, timeGainedMinutes } = this.calculateTotal(monthRecords);

        return {
            periodType: 'monthly',
            periodStart: start.toISOString(),
            periodEnd: end.toISOString(),
            totalPoints,
            timeGainedMinutes,
        };
    }
}
