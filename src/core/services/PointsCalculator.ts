// Pure calculation service - No side effects, immutable
import { Action, DailyRecord, ActiveBuff } from '../types';
import { getTodayString, getArgentinaDate } from '../utils/dateUtils';
import { GachaEngine } from './GachaEngine';

export class PointsCalculator {
    /**
     * Calculate points for a given action and duration
     * @param action - The action being performed
     * @param durationMinutes - Duration in minutes
     * @returns Calculated points (can be negative)
     */
    static calculatePoints(action: Action, durationMinutes: number, metricValue?: number): number {
        if (action.metadata?.inputType === 'impact' && metricValue !== undefined) {
            return metricValue;
        }
        if (action.metadata?.inputType === 'milestone') {
            return 20000; // Fixed reward for completing a milestone
        }
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
        activeBuffs: ActiveBuff[] = [], // Default to empty for backward compatibility
        date?: string,
        notes?: string,
        metricValue?: number,
        targetGoalId?: string
    ): Omit<DailyRecord, 'id'> {
        let pointsCalculated = this.calculatePoints(action, durationMinutes, metricValue);

        // precise-check: multipliers only on positive actions
        if (pointsCalculated > 0) {
            const originalPoints = pointsCalculated;
            pointsCalculated = this.applyMultipliers(pointsCalculated, activeBuffs, action.id, 'positive');

            if (pointsCalculated > originalPoints) {
                const effectiveMult = (pointsCalculated / originalPoints).toFixed(1);
                const multNote = `[x${effectiveMult} Bonus]`;
                notes = notes ? `${notes} ${multNote}` : multNote;
            }
        }

        const now = getArgentinaDate();

        return {
            actionId: action.id,
            actionName: action.name,
            date: date || getTodayString(),
            timestamp: now.toISOString(),
            durationMinutes,
            metricValue,
            pointsCalculated,
            targetGoalId,
            notes,
        };
    }

    /**
     * Apply active buff multipliers to base points.
     * Only applies to POSITIVE activities. Negative activities are never multiplied.
     * Delegates multiplier math to GachaEngine (hard cap x4.0).
     * 
     * @param basePoints - Original calculated points
     * @param buffs - Currently active buffs
     * @param actionId - Optional action ID for activity-specific buffs
     * @param actionType - 'positive' or 'negative'
     * @returns Final points after multiplier application
     */
    static applyMultipliers(
        basePoints: number,
        buffs: ActiveBuff[],
        actionId?: string,
        actionType?: 'positive' | 'negative'
    ): number {
        // Only multiply positive activities
        if (actionType === 'negative' || basePoints <= 0) {
            return basePoints;
        }

        const effectiveMultiplier = GachaEngine.calculateEffectiveMultiplier(buffs, actionId);
        return Math.floor(basePoints * effectiveMultiplier);
    }
}
