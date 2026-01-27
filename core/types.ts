// Core domain types - Pure TypeScript interfaces

export type ActionType = 'positive' | 'negative';

export interface Action {
    id: string;
    name: string;
    type: ActionType;
    pointsPerMinute: number;
    metadata?: {
        inputType?: 'hours' | 'pages' | 'distance-time' | 'time' | 'time-note' | 'time-subject';
        unit?: string;
        estimatedMinutesPerPage?: number;
        [key: string]: any;
    };
}

export interface DailyRecord {
    id: string;
    actionId: string;
    actionName: string;
    date: string; // ISO date string
    durationMinutes: number;
    pointsCalculated: number;
    notes?: string;
}

export interface User {
    id: string;
    username: string;
    preferences: Record<string, any>;
    level: number;
    xp: number;
}

export interface Goal {
    id: string;
    userId: string;
    title: string;
    type: 'points' | 'duration' | 'count';
    targetValue: number;
    currentValue: number;
    actionId?: string; // Optional specific action constraint
    metricType?: 'pages' | 'kilometers' | 'hours' | 'points' | 'activities'; // NEW: Type of metric to track
    metricUnit?: string; // NEW: Display unit (e.g., "páginas", "km", "horas")
    startDate: string;
    endDate?: string;
    isCompleted: boolean;
}

export interface DailyStats {
    date: string;
    totalPoints: number;
    isPositive: boolean;
    mainActivity: string; // Most time spent on
    totalActivities: number;
}


export interface Balance {
    periodType: 'daily' | 'weekly' | 'monthly';
    periodStart: string; // ISO
    periodEnd: string;   // ISO
    totalPoints: number;
    timeGainedMinutes: number;
}
