// VacationService - Pure domain logic for vacation periods
// No external dependencies (Supabase, etc.) - only pure TypeScript

import { VacationPeriod } from '../types';
import { parseISO, addDays, format, differenceInDays } from 'date-fns';

export class VacationService {
    /**
     * Checks if a specific date falls within any vacation period
     */
    static isDateInVacation(date: string, periods: VacationPeriod[]): boolean {
        return periods.some(p => date >= p.startDate && date <= p.endDate);
    }

    /**
     * Checks if a date falls in a grace period (1 day after any vacation ends)
     */
    static isGracePeriod(date: string, periods: VacationPeriod[]): boolean {
        return periods.some(p => {
            const dayAfterEnd = format(addDays(parseISO(p.endDate), 1), 'yyyy-MM-dd');
            return date === dayAfterEnd;
        });
    }

    /**
     * Filters out dates that are covered by vacation periods or grace periods.
     * Returns only the dates that should still count as missed (potential strikes).
     */
    static filterVacationDays(dates: string[], periods: VacationPeriod[]): string[] {
        if (periods.length === 0) return dates;

        return dates.filter(date =>
            !VacationService.isDateInVacation(date, periods) &&
            !VacationService.isGracePeriod(date, periods)
        );
    }

    /**
     * Returns the currently active vacation period, if any
     */
    static getActiveVacation(periods: VacationPeriod[], today: string): VacationPeriod | null {
        return periods.find(p => today >= p.startDate && today <= p.endDate) || null;
    }

    /**
     * Checks if a period needs a start notification
     * (today is the start date and notification hasn't been sent)
     */
    static needsStartNotification(period: VacationPeriod, today: string): boolean {
        return today >= period.startDate && !period.notifiedStart;
    }

    /**
     * Checks if a period needs an end warning notification
     * (today is 1 day before end and notification hasn't been sent)
     */
    static needsEndWarning(period: VacationPeriod, today: string): boolean {
        const dayBeforeEnd = format(addDays(parseISO(period.endDate), -1), 'yyyy-MM-dd');
        return today === dayBeforeEnd && !period.notifiedEndWarning;
    }

    /**
     * Calculates vacation usage statistics for the current year
     */
    static getVacationStats(periods: VacationPeriod[], today: string): {
        totalDaysUsed: number;
        totalPeriods: number;
        daysUsedThisYear: number;
        periodsThisYear: number;
        nextVacation: VacationPeriod | null;
        percentOfYear: number;
    } {
        const currentYear = today.substring(0, 4);
        const yearPeriods = periods.filter(p => p.startDate.startsWith(currentYear));

        // Calculate total days for this year
        const daysUsedThisYear = yearPeriods.reduce((sum, p) => {
            const start = parseISO(p.startDate);
            const end = parseISO(p.endDate);
            return sum + differenceInDays(end, start) + 1; // +1 to include both start and end
        }, 0);

        // Calculate total days ever
        const totalDaysUsed = periods.reduce((sum, p) => {
            const start = parseISO(p.startDate);
            const end = parseISO(p.endDate);
            return sum + differenceInDays(end, start) + 1;
        }, 0);

        // Find next upcoming vacation
        const futurePeriods = periods
            .filter(p => p.startDate > today)
            .sort((a, b) => a.startDate.localeCompare(b.startDate));

        const nextVacation = futurePeriods.length > 0 ? futurePeriods[0] : null;

        return {
            totalDaysUsed,
            totalPeriods: periods.length,
            daysUsedThisYear,
            periodsThisYear: yearPeriods.length,
            nextVacation,
            percentOfYear: Math.round((daysUsedThisYear / 365) * 100 * 10) / 10,
        };
    }

    /**
     * Validates a new vacation period before creation
     */
    static validatePeriod(
        startDate: string,
        endDate: string,
        reason: string,
        existingPeriods: VacationPeriod[]
    ): { valid: boolean; error?: string } {
        if (!startDate || !endDate) {
            return { valid: false, error: 'Las fechas de inicio y fin son obligatorias' };
        }

        if (endDate < startDate) {
            return { valid: false, error: 'La fecha de fin debe ser posterior o igual a la de inicio' };
        }

        const duration = differenceInDays(parseISO(endDate), parseISO(startDate));
        if (duration > 30) {
            return { valid: false, error: 'El período no puede exceder 30 días' };
        }

        if (!reason.trim()) {
            return { valid: false, error: 'Debes indicar un motivo para las vacaciones' };
        }

        // Check for overlapping periods
        const overlaps = existingPeriods.some(p =>
            (startDate >= p.startDate && startDate <= p.endDate) ||
            (endDate >= p.startDate && endDate <= p.endDate) ||
            (startDate <= p.startDate && endDate >= p.endDate)
        );

        if (overlaps) {
            return { valid: false, error: 'El período se superpone con vacaciones existentes' };
        }

        return { valid: true };
    }

    /**
     * Returns the status label for a vacation period
     */
    static getPeriodStatus(period: VacationPeriod, today: string): 'active' | 'future' | 'past' {
        if (today >= period.startDate && today <= period.endDate) return 'active';
        if (today < period.startDate) return 'future';
        return 'past';
    }
}
