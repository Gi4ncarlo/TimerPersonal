// Strike detection and statistics service
import { DailyRecord, Strike, StrikeStats } from '../types';
import { getTodayString } from '../utils/dateUtils';
import { subDays, format, differenceInDays, parseISO } from 'date-fns';

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
     * Encuentra strikes recientes (últimos 30 días)
     */
    static getRecentStrikes(strikes: Strike[], days: number = 30): Strike[] {
        const cutoffDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
        return strikes.filter(s => s.strikeDate >= cutoffDate);
    }
}
