// Pure calculation service - No side effects, immutable
import { Action, DailyRecord } from '../types';
import { getTodayString, getArgentinaDate } from '../utils/dateUtils';

export class PointsCalculator {
    /**
     * Calculate points for a given action and duration
     * @param action - The action being performed
     * @param durationMinutes - Duration in minutes
     * @returns Calculated points (can be negative)
     */
    static calculatePoints(action: Action, durationMinutes: number): number {
        return action.pointsPerMinute * durationMinutes;
    }

    /**
     * Convert points to time gained/lost in minutes
     * @param points - Total points (positive = gained, negative = lost)
     * @returns Time in minutes
     */
    static calculateTimeGained(points: number): number {
        // Each point = 1 minute of time gained/lost
        return points;
    }

    /**
     * Create a daily record with calculated points
     * @param action - The action performed
     * @param durationMinutes - Duration
     * @param date - Date of the activity (optional, defaults to today in Argentina timezone)
     * @param notes - Optional notes
     * @returns New DailyRecord with calculated points and timestamp
     */
    static createRecord(
        action: Action,
        durationMinutes: number,
        date?: string,
        notes?: string,
        metricValue?: number
    ): Omit<DailyRecord, 'id'> {
        const pointsCalculated = this.calculatePoints(action, durationMinutes);
        const now = getArgentinaDate();

        return {
            actionId: action.id,
            actionName: action.name,
            date: date || getTodayString(),
            timestamp: now.toISOString(),
            durationMinutes,
            metricValue,
            pointsCalculated,
            notes,
        };
    }
}
