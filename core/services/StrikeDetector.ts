// Strike detection and statistics service
import { DailyRecord, Strike, StrikeStats } from '../types';
import { getTodayString } from '../utils/dateUtils';
import { subDays, format, differenceInDays, parseISO, startOfWeek } from 'date-fns';

export class StrikeDetector {
    /**
     * Detecta si hubo un strike (día sin actividad) en una fecha específica
     * @param records - Todos los registros del usuario
     * @param date - Fecha a verificar (YYYY-MM-DD)
     * @returns true si no hay actividad en esa fecha
     */
    static hasStrikeOnDate(records: DailyRecord[], date: string): boolean {
        const dateRecords = records.filter(r => r.date === date);
        return dateRecords.length === 0;
    }

    /**
     * Detecta si hubo un strike ayer
     * Se usa para verificar al cargar el dashboard
     */
    static detectYesterdayStrike(records: DailyRecord[]): { hasStrike: boolean; date: string } {
        const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
        const yesterdayRecords = records.filter(r => r.date === yesterday);

        return {
            hasStrike: yesterdayRecords.length === 0,
            date: yesterday
        };
    }

    /**
     * Calcula estadísticas de strikes
     */
    static calculateStats(strikes: Strike[]): StrikeStats {
        if (strikes.length === 0) {
            return {
                totalStrikes: 0,
                currentStreak: 0,
                longestStreak: 0
            };
        }

        const sortedStrikes = [...strikes].sort((a, b) =>
            b.strikeDate.localeCompare(a.strikeDate)
        );

        // Calcular racha actual (días sin strikes desde el último)
        let currentStreak = 0;
        const lastStrike = parseISO(sortedStrikes[0].strikeDate);
        const today = new Date();
        const diffDays = differenceInDays(today, lastStrike);
        currentStreak = Math.max(0, diffDays - 1);

        // Calcular racha más larga (días consecutivos sin strikes)
        let longestStreak = 0;
        let tempStreak = 0;

        // Ordenar por fecha ascendente para calcular rachas
        const ascStrikes = [...strikes].sort((a, b) =>
            a.strikeDate.localeCompare(b.strikeDate)
        );

        for (let i = 0; i < ascStrikes.length - 1; i++) {
            const current = parseISO(ascStrikes[i].strikeDate);
            const next = parseISO(ascStrikes[i + 1].strikeDate);
            const daysBetween = differenceInDays(next, current);

            if (daysBetween > 1) {
                tempStreak = daysBetween - 1;
                longestStreak = Math.max(longestStreak, tempStreak);
            }
        }

        return {
            totalStrikes: strikes.length,
            currentStreak,
            longestStreak,
            lastStrikeDate: sortedStrikes[0]?.strikeDate
        };
    }

    /**
     * Finds recent strikes (últimos 30 días)
     */
    static getRecentStrikes(strikes: Strike[], days: number = 30): Strike[] {
        const cutoffDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
        return strikes.filter(s => s.strikeDate >= cutoffDate);
    }

    /**
     * Calcula rachas por actividad específica
     */
    static calculateActivityStreaks(records: DailyRecord[]): Record<string, { current: number; longest: number }> {
        const streaks: Record<string, { current: number; longest: number; lastDate: string; temp: number }> = {};

        // Sort records by date ascending
        const sortedRecords = [...records].sort((a, b) => a.date.localeCompare(b.date));
        const today = getTodayString();
        const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

        sortedRecords.forEach(record => {
            const name = record.actionName;
            if (!streaks[name]) {
                streaks[name] = { current: 0, longest: 0, lastDate: '', temp: 0 };
            }

            const s = streaks[name];
            if (s.lastDate === '') {
                s.temp = 1;
            } else {
                const diff = differenceInDays(parseISO(record.date), parseISO(s.lastDate));
                if (diff === 1) {
                    s.temp++;
                } else if (diff > 1) {
                    s.temp = 1;
                }
            }
            s.lastDate = record.date;
            s.longest = Math.max(s.longest, s.temp);
        });

        // Final current streak check: if last activity was not today or yesterday, current is 0
        const result: Record<string, { current: number; longest: number }> = {};
        Object.keys(streaks).forEach(name => {
            const s = streaks[name];
            const isActive = s.lastDate === today || s.lastDate === yesterday;
            result[name] = {
                current: isActive ? s.temp : 0,
                longest: s.longest
            };
        });

        return result;
    }

    /**
     * Compara los puntos de esta semana vs la anterior
     */
    static getWeeklyComparison(records: DailyRecord[]): {
        thisWeekPoints: number;
        lastWeekPoints: number;
        difference: number;
        percent: number;
    } {
        const today = new Date();
        const startThisWeek = startOfWeek(today, { weekStartsOn: 1 });
        const startLastWeek = subDays(startThisWeek, 7);
        const endLastWeek = subDays(startThisWeek, 1);

        const thisWeekRecords = records.filter(r => {
            const d = parseISO(r.date);
            return d >= startThisWeek;
        });

        const lastWeekRecords = records.filter(r => {
            const d = parseISO(r.date);
            return d >= startLastWeek && d <= endLastWeek;
        });

        const thisWeekPoints = thisWeekRecords.reduce((sum, r) => sum + r.pointsCalculated, 0);
        const lastWeekPoints = lastWeekRecords.reduce((sum, r) => sum + r.pointsCalculated, 0);
        const difference = thisWeekPoints - lastWeekPoints;
        const percent = lastWeekPoints !== 0 ? (difference / Math.abs(lastWeekPoints)) * 100 : 100;

        return { thisWeekPoints, lastWeekPoints, difference, percent };
    }
}
