// Pure calculation service - No side effects, immutable
import { Action, DailyRecord } from '../types';

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
     * @param date - Date of the activity
     * @param notes - Optional notes
     * @returns New DailyRecord with calculated points
     */
    static createRecord(
        action: Action,
        durationMinutes: number,
        date: string,
        notes?: string
    ): Omit<DailyRecord, 'id'> {
        const pointsCalculated = this.calculatePoints(action, durationMinutes);

        return {
            actionId: action.id,
            actionName: action.name,
            date,
            durationMinutes,
            pointsCalculated,
            notes,
        };
    }
}
