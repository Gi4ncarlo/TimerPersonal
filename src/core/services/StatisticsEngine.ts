// StatisticsEngine — Pure computation logic for the Estadísticas page
// No UI knowledge. No data fetching. Just transforms data → stats.

import { DailyRecord, Goal } from '../types';
import { format, parseISO, getHours, getDay } from 'date-fns';
import { es } from 'date-fns/locale';

// ─── Types ───────────────────────────────────────────────────────

export interface ActivityDistribution {
    name: string;
    minutes: number;
    hours: number;
    points: number;
    percentage: number;
    color: string;
}

export interface KPIData {
    label: string;
    value: number;
    unit: string;
    change: number;
    sparkline: number[];
    icon: string;
    format?: 'number' | 'percent';
}

export interface TopActivity {
    name: string;
    count: number;
    totalMinutes: number;
    totalPoints: number;
    percentage: number;
}

export interface PersonalBest {
    label: string;
    value: string;
    detail: string;
    icon: string;
}

export interface HourlyBucket {
    hour: string;
    label: string;
    count: number;
    points: number;
}

export interface Insight {
    icon: string;
    text: string;
    type: 'positive' | 'neutral' | 'warning';
}

export interface GoalCompletionData {
    total: number;
    completed: number;
    percentage: number;
    goals: { title: string; progress: number; target: number; done: boolean }[];
}

export interface DayStat {
    date: string;
    dateFormatted: string;
    totalPoints: number;
    totalMinutes: number;
    isPositive: boolean;
    mainActivity: string;
    records: DailyRecord[];
    activityBreakdown: Record<string, number>;
}

// ─── Constants ───────────────────────────────────────────────────

export const CHART_COLORS = [
    '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
    '#ec4899', '#14b8a6', '#f97316', '#a855f7', '#22d3ee',
    '#84cc16', '#6366f1',
];

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// ─── Engine ──────────────────────────────────────────────────────

export class StatisticsEngine {

    // ── Pie Chart: Activity distribution ────────────────────────
    static computeActivityDistribution(records: DailyRecord[]): ActivityDistribution[] {
        const map: Record<string, { minutes: number; points: number }> = {};

        records.forEach(r => {
            if (!map[r.actionName]) map[r.actionName] = { minutes: 0, points: 0 };
            map[r.actionName].minutes += r.durationMinutes;
            map[r.actionName].points += r.pointsCalculated;
        });

        const totalMinutes = Object.values(map).reduce((s, v) => s + v.minutes, 0);
        if (totalMinutes === 0) return [];

        return Object.entries(map)
            .map(([name, data], i) => ({
                name,
                minutes: Math.round(data.minutes),
                hours: Number((data.minutes / 60).toFixed(1)),
                points: Math.round(data.points),
                percentage: Math.round((data.minutes / totalMinutes) * 100),
                color: CHART_COLORS[i % CHART_COLORS.length],
            }))
            .sort((a, b) => b.minutes - a.minutes);
    }

    // ── Stacked Bar: Daily breakdown by activity (POINTS) ────────
    // ── Stacked Bar: Daily breakdown by activity (HOURS) & Points Line ──
    static computeDailyBreakdown(dayStats: DayStat[]): { data: any[]; activities: string[] } {
        // Collect all activity names that have > 0 duration
        const activitySet = new Set<string>();

        // We need to look at the records to find valid activities
        dayStats.forEach(d => {
            d.records.forEach(r => {
                if (r.durationMinutes > 0) {
                    activitySet.add(r.actionName);
                }
            });
        });

        const activities = Array.from(activitySet);

        const data = dayStats.map(d => {
            const entry: any = {
                fecha: d.dateFormatted,
                totalPoints: Math.round(d.totalPoints) // For the line chart
            };

            // Add hours for each active activity
            activities.forEach(a => {
                // We need to fetch the minutes.
                // Since d.activityBreakdown was derived from records in page.tsx, 
                // and we reverted page.tsx to sum minutes, we can use it directly.
                const minutes = d.activityBreakdown[a] || 0;
                entry[a] = Number((minutes / 60).toFixed(1));
            });

            // Add specific markers for Tooltip only (Strikes/Bonuses)
            d.records.forEach(r => {
                if (r.durationMinutes === 0) {
                    // It's a 0-duration event (Strike, Bonus, etc.)
                    // We add it to the entry so custom tooltip can find it.
                    entry[`__event_${r.actionName}`] = r.pointsCalculated;
                }
            });

            return entry;
        });

        return { data, activities };
    }



    // ── KPI Cards ───────────────────────────────────────────────
    static computeKPIs(dayStats: DayStat[], records: DailyRecord[]): KPIData[] {
        const totalPoints = records.reduce((s, r) => s + r.pointsCalculated, 0);
        const activeDays = dayStats.filter(d => d.records.length > 0).length;
        const totalDays = dayStats.length;
        const consistency = totalDays > 0 ? Math.round((activeDays / totalDays) * 100) : 0;
        const avgDaily = activeDays > 0 ? Math.round(totalPoints / activeDays) : 0;

        // Best day
        const bestDay = dayStats.reduce((best, d) =>
            d.totalPoints > best.totalPoints ? d : best
            , dayStats[0] || { totalPoints: 0, dateFormatted: '-' });

        // Sparklines (last 7 days of points)
        const last7 = dayStats.slice(-7);
        const sparkPoints = last7.map(d => Math.floor(d.totalPoints));
        const sparkActivities = last7.map(d => d.records.length);
        const sparkConsistency = last7.map(d => d.records.length > 0 ? 100 : 0);

        // Change calculations (compare last 7 vs previous 7)
        const recent7 = dayStats.slice(-7);
        const prev7 = dayStats.slice(-14, -7);
        const recentTotal = recent7.reduce((s, d) => s + d.totalPoints, 0);
        const prevTotal = prev7.reduce((s, d) => s + d.totalPoints, 0);
        const pointsChange = prevTotal !== 0 ? Math.round(((recentTotal - prevTotal) / Math.abs(prevTotal)) * 100) : 0;

        const recentActive = recent7.filter(d => d.records.length > 0).length;
        const prevActive = prev7.filter(d => d.records.length > 0).length;
        const consistencyChange = prevActive !== 0 ? Math.round(((recentActive - prevActive) / prevActive) * 100) : 0;

        return [
            {
                label: 'Puntos Totales',
                value: Math.floor(totalPoints),
                unit: 'sendas',
                change: pointsChange,
                sparkline: sparkPoints,
                icon: '⚡',
            },
            {
                label: 'Promedio Diario',
                value: avgDaily,
                unit: 'sendas/día',
                change: pointsChange,
                sparkline: sparkPoints,
                icon: '📊',
            },
            {
                label: 'Consistencia',
                value: consistency,
                unit: '%',
                change: consistencyChange,
                sparkline: sparkConsistency,
                icon: '🎯',
                format: 'percent',
            },
            {
                label: 'Mejor Día',
                value: Math.floor(bestDay.totalPoints),
                unit: 'sendas',
                change: 0,
                sparkline: sparkActivities,
                icon: '🏅',
            },
        ];
    }

    // ── Top 5 Activities ────────────────────────────────────────
    static computeTopActivities(records: DailyRecord[], limit = 5): TopActivity[] {
        const map: Record<string, { count: number; minutes: number; points: number }> = {};
        records.forEach(r => {
            if (!map[r.actionName]) map[r.actionName] = { count: 0, minutes: 0, points: 0 };
            map[r.actionName].count++;
            map[r.actionName].minutes += r.durationMinutes;
            map[r.actionName].points += r.pointsCalculated;
        });

        const total = records.length;
        return Object.entries(map)
            .map(([name, data]) => ({
                name,
                count: data.count,
                totalMinutes: Math.round(data.minutes),
                totalPoints: Math.round(data.points),
                percentage: total > 0 ? Math.round((data.count / total) * 100) : 0,
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }

    // ── Personal Bests ──────────────────────────────────────────
    static computePersonalBests(dayStats: DayStat[], records: DailyRecord[]): PersonalBest[] {
        const bests: PersonalBest[] = [];

        // Best day by points
        if (dayStats.length > 0) {
            const best = dayStats.reduce((a, b) => a.totalPoints > b.totalPoints ? a : b);
            if (best.totalPoints > 0) {
                bests.push({
                    label: 'Mejor Día',
                    value: `+${Math.floor(best.totalPoints)} sendas`,
                    detail: best.dateFormatted,
                    icon: '🏆',
                });
            }
        }

        // Most activities in a single day
        if (dayStats.length > 0) {
            const busiest = dayStats.reduce((a, b) => a.records.length > b.records.length ? a : b);
            if (busiest.records.length > 0) {
                bests.push({
                    label: 'Día más Activo',
                    value: `${busiest.records.length} actividades`,
                    detail: busiest.dateFormatted,
                    icon: '🔥',
                });
            }
        }

        // Best week (group by week and find max)
        const weekMap: Record<string, number> = {};
        dayStats.forEach(d => {
            try {
                const weekKey = format(parseISO(d.date), "'Sem' w", { locale: es });
                weekMap[weekKey] = (weekMap[weekKey] || 0) + d.totalPoints;
            } catch { /* skip */ }
        });
        const bestWeekEntry = Object.entries(weekMap).sort((a, b) => b[1] - a[1])[0];
        if (bestWeekEntry && bestWeekEntry[1] > 0) {
            bests.push({
                label: 'Mejor Semana',
                value: `+${Math.floor(bestWeekEntry[1])} sendas`,
                detail: bestWeekEntry[0],
                icon: '📅',
            });
        }

        // Longest positive streak (consecutive days with positive balance)
        let maxStreak = 0, currentStreak = 0;
        dayStats.forEach(d => {
            if (d.isPositive && d.records.length > 0) {
                currentStreak++;
                maxStreak = Math.max(maxStreak, currentStreak);
            } else {
                currentStreak = 0;
            }
        });
        if (maxStreak > 0) {
            bests.push({
                label: 'Racha Positiva',
                value: `${maxStreak} días`,
                detail: 'días consecutivos en positivo',
                icon: '⚡',
            });
        }

        return bests;
    }

    // ── Hourly Distribution ─────────────────────────────────────
    static computeHourlyDistribution(records: DailyRecord[]): HourlyBucket[] {
        const buckets: HourlyBucket[] = [];
        for (let h = 0; h < 24; h++) {
            buckets.push({
                hour: String(h).padStart(2, '0'),
                label: `${String(h).padStart(2, '0')}:00`,
                count: 0,
                points: 0,
            });
        }

        records.forEach(r => {
            if (r.timestamp) {
                try {
                    const hour = getHours(parseISO(r.timestamp));
                    buckets[hour].count++;
                    buckets[hour].points += r.pointsCalculated;
                } catch { /* skip invalid timestamp */ }
            }
        });

        return buckets;
    }

    // ── Heatmap Data ────────────────────────────────────────────
    static computeHeatmapData(dayStats: DayStat[]): {
        cells: { date: string; formatted: string; points: number; level: number; activities: number }[];
        maxPoints: number;
    } {
        const points = dayStats.map(d => d.totalPoints);
        const maxP = Math.max(...points, 1);

        const cells = dayStats.map(d => ({
            date: d.date,
            formatted: d.dateFormatted,
            points: Math.floor(d.totalPoints),
            activities: d.records.length,
            level: d.records.length === 0 ? 0 :
                d.totalPoints <= 0 ? -1 :
                    d.totalPoints / maxP < 0.25 ? 1 :
                        d.totalPoints / maxP < 0.5 ? 2 :
                            d.totalPoints / maxP < 0.75 ? 3 : 4,
        }));

        return { cells, maxPoints: maxP };
    }

    // ── Goal Completion ─────────────────────────────────────────
    static computeGoalCompletion(goals: Goal[]): GoalCompletionData {
        if (goals.length === 0) {
            return { total: 0, completed: 0, percentage: 0, goals: [] };
        }

        const completed = goals.filter(g => g.isCompleted).length;
        const percentage = Math.round((completed / goals.length) * 100);

        const goalList = goals.map(g => ({
            title: g.title,
            progress: g.currentValue,
            target: g.targetValue,
            done: g.isCompleted,
        }));

        return { total: goals.length, completed, percentage, goals: goalList };
    }

    // ── Smart Insights ──────────────────────────────────────────
    static generateInsights(
        dayStats: DayStat[],
        records: DailyRecord[],
        streaks: Record<string, { current: number; longest: number }>
    ): Insight[] {
        const insights: Insight[] = [];

        // 1. Most consistent activity
        const bestStreak = Object.entries(streaks)
            .filter(([_, s]) => s.current > 0)
            .sort((a, b) => b[1].current - a[1].current)[0];
        if (bestStreak && bestStreak[1].current >= 2) {
            insights.push({
                icon: '🔥',
                text: `Tu actividad más consistente es "${bestStreak[0]}" con ${bestStreak[1].current} días seguidos.`,
                type: 'positive',
            });
        }

        // 2. Most productive day of week
        const dayOfWeekPoints: number[] = [0, 0, 0, 0, 0, 0, 0];
        const dayOfWeekCounts: number[] = [0, 0, 0, 0, 0, 0, 0];
        dayStats.forEach(d => {
            try {
                const dow = getDay(parseISO(d.date));
                dayOfWeekPoints[dow] += d.totalPoints;
                dayOfWeekCounts[dow]++;
            } catch { /* skip */ }
        });
        const avgByDay = dayOfWeekPoints.map((p, i) =>
            dayOfWeekCounts[i] > 0 ? p / dayOfWeekCounts[i] : 0
        );
        const bestDow = avgByDay.indexOf(Math.max(...avgByDay));
        if (Math.max(...avgByDay) > 0) {
            insights.push({
                icon: '📆',
                text: `Los ${DAY_NAMES[bestDow]} son tu día más productivo (promedio ${Math.floor(avgByDay[bestDow])} sendas).`,
                type: 'neutral',
            });
        }

        // 3. Positive vs negative activities ratio
        const positive = records.filter(r => r.pointsCalculated >= 0).length;
        const negative = records.filter(r => r.pointsCalculated < 0).length;
        const total = records.length;
        if (total > 0) {
            const posPercent = Math.round((positive / total) * 100);
            if (posPercent >= 70) {
                insights.push({
                    icon: '✅',
                    text: `El ${posPercent}% de tus actividades son positivas. ¡Excelente balance!`,
                    type: 'positive',
                });
            } else if (posPercent < 50) {
                insights.push({
                    icon: '⚠️',
                    text: `Solo el ${posPercent}% de tus actividades son positivas. Intentá darle más espacio a las que suman.`,
                    type: 'warning',
                });
            } else {
                insights.push({
                    icon: '📊',
                    text: `${posPercent}% actividades positivas vs ${100 - posPercent}% negativas. Buen equilibrio general.`,
                    type: 'neutral',
                });
            }
        }

        // 4. Inactive days warning
        const inactiveDays = dayStats.filter(d => d.records.length === 0).length;
        const inactivePercent = dayStats.length > 0 ? Math.round((inactiveDays / dayStats.length) * 100) : 0;
        if (inactivePercent > 40) {
            insights.push({
                icon: '💤',
                text: `Tuviste ${inactiveDays} días sin actividad (${inactivePercent}%). La constancia es clave para el progreso.`,
                type: 'warning',
            });
        }

        // 5. Hourly peak
        const hourly = this.computeHourlyDistribution(records);
        const peakHour = hourly.reduce((a, b) => a.count > b.count ? a : b);
        if (peakHour.count > 0) {
            insights.push({
                icon: '⏰',
                text: `Tu horario pico de actividad es a las ${peakHour.label}hs.`,
                type: 'neutral',
            });
        }

        return insights.slice(0, 3); // Max 3 insights
    }
}
