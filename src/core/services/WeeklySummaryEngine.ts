import { DailyRecord, Strike, WeeklySummary } from '@/core/types';

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DAY_NAMES_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/**
 * Pure logic engine for computing weekly summaries.
 * No DB or UI dependencies — only pure data transformations.
 */
export const WeeklySummaryEngine = {

    /**
     * Computes all metrics for a given week from raw records and strikes.
     */
    computeWeeklySummary(
        userId: string,
        records: DailyRecord[],
        strikes: Strike[],
        weekStart: string,
        weekEnd: string,
        leaderboardPosition: number | null
    ): Omit<WeeklySummary, 'id' | 'createdAt'> {
        // Filter records in range
        const weekRecords = records.filter(r => r.date >= weekStart && r.date <= weekEnd);
        const weekStrikes = strikes.filter(s => s.strikeDate >= weekStart && s.strikeDate <= weekEnd);

        // Total points (net)
        const totalPoints = weekRecords.reduce((sum, r) => sum + r.pointsCalculated, 0);
        const totalActivities = weekRecords.length;
        const totalStrikes = weekStrikes.length;

        // Daily breakdown: group points by day of week
        const dailyBreakdown: Record<string, number> = {
            'Lun': 0, 'Mar': 0, 'Mié': 0, 'Jue': 0, 'Vie': 0, 'Sáb': 0, 'Dom': 0
        };

        const dailyPointsByDate: Record<string, number> = {};

        for (const r of weekRecords) {
            const dateObj = new Date(r.date + 'T12:00:00');
            const dayIdx = dateObj.getDay();
            const dayName = DAY_NAMES[dayIdx];
            dailyBreakdown[dayName] = (dailyBreakdown[dayName] || 0) + r.pointsCalculated;
            dailyPointsByDate[r.date] = (dailyPointsByDate[r.date] || 0) + r.pointsCalculated;
        }

        // Best day
        let bestDayName: string | null = null;
        let bestDayPoints = 0;
        for (const [dateStr, pts] of Object.entries(dailyPointsByDate)) {
            if (pts > bestDayPoints) {
                bestDayPoints = pts;
                const dateObj = new Date(dateStr + 'T12:00:00');
                bestDayName = DAY_NAMES_FULL[dateObj.getDay()];
            }
        }

        // Most frequent action
        const actionCounts: Record<string, number> = {};
        for (const r of weekRecords) {
            // Skip system/reward records
            if (r.actionName.startsWith('✨') || r.actionName.startsWith('RECOMPENSA')) continue;
            actionCounts[r.actionName] = (actionCounts[r.actionName] || 0) + 1;
        }

        let mostFrequentAction: string | null = null;
        let mostFrequentCount = 0;
        for (const [name, count] of Object.entries(actionCounts)) {
            if (count > mostFrequentCount) {
                mostFrequentCount = count;
                mostFrequentAction = name;
            }
        }

        // Strike days
        const strikeDays = weekStrikes.map(s => s.strikeDate);

        return {
            userId,
            weekStart,
            weekEnd,
            totalPoints,
            totalActivities,
            totalStrikes,
            bestDayName,
            bestDayPoints,
            mostFrequentAction,
            mostFrequentCount,
            leaderboardPosition,
            dailyBreakdown,
            strikeDays,
        };
    },

    /**
     * Generates a dynamic one-line message based on performance comparison.
     */
    getComparisonMessage(current: WeeklySummary, previous: WeeklySummary | null): string {
        if (!previous) return '📊 ¡Tu primera semana registrada! Este es tu punto de partida.';

        const diff = current.totalPoints - previous.totalPoints;
        const percentChange = previous.totalPoints > 0
            ? Math.round((diff / previous.totalPoints) * 100)
            : 100;

        if (percentChange >= 30) return '🔥 ¡Semana ÉPICA! Superaste la anterior por mucho.';
        if (percentChange >= 10) return '🚀 ¡Gran semana! Mejoraste tu rendimiento.';
        if (percentChange >= 0) return '✅ Semana sólida. Mantuviste tu nivel.';
        if (percentChange >= -15) return '⚡ Semana regular. ¡Podés mejorar!';
        if (percentChange >= -30) return '🌧️ Semana difícil. Esta es tu oportunidad de remontar.';
        return '💪 No fue tu mejor semana, pero cada lunes es un nuevo comienzo.';
    },

    /**
     * Compares two metric values and returns a direction indicator.
     */
    getMetricComparison(current: number, previous: number): 'up' | 'same' | 'down' {
        if (current > previous) return 'up';
        if (current < previous) return 'down';
        return 'same';
    },

    /**
     * Returns the Monday date string for a given date.
     */
    getMondayOfWeek(dateStr: string): string {
        const date = new Date(dateStr + 'T12:00:00');
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(date.setDate(diff));
        return monday.toISOString().split('T')[0];
    },

    /**
     * Returns the Sunday date string for a given Monday.
     */
    getSundayFromMonday(mondayStr: string): string {
        const monday = new Date(mondayStr + 'T12:00:00');
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        return sunday.toISOString().split('T')[0];
    },

    /** 
     * Returns the Monday of the previous week.
     */
    getPreviousWeekMonday(mondayStr: string): string {
        const monday = new Date(mondayStr + 'T12:00:00');
        monday.setDate(monday.getDate() - 7);
        return monday.toISOString().split('T')[0];
    },
};
