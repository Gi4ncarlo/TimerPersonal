// Core domain types - Pure TypeScript interfaces

export type ActionType = 'positive' | 'negative';

export interface Action {
    id: string;
    userId?: string | null;
    name: string;
    type: ActionType;
    pointsPerMinute: number;
    metadata?: {
        inputType?: 'hours' | 'pages' | 'distance-time' | 'time' | 'time-note' | 'time-subject' | 'impact' | 'milestone';
        unit?: string;
        estimatedMinutesPerPage?: number;
        [key: string]: any;
    };
}

export interface DailyRecord {
    id: string;
    actionId: string;
    actionName: string;
    date: string; // ISO date string (YYYY-MM-DD in Argentina timezone)
    timestamp?: string; // ISO datetime string with timezone info
    durationMinutes: number;
    metricValue?: number; // Added for tracking pages, km, etc.
    pointsCalculated: number;
    targetGoalId?: string; // NEW: Specific goal this record should complete
    notes?: string;
}

export interface User {
    id: string;
    username: string;
    email?: string;
    role: 'admin' | 'user';
    preferences: Record<string, any>;
    level: number;
    xp: number;
    avatarUrl?: string;
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
    period: 'weekly' | 'monthly' | 'annual' | 'milestone'; // NEW: Goal period
    isMilestone: boolean; // NEW: Whether it's a long-term milestone
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

export interface Strike {
    id: string;
    userId: string;
    strikeDate: string; // YYYY-MM-DD
    reason: string;
    detectedAt: string; // ISO datetime
}

export interface StrikeStats {
    totalStrikes: number;
    currentStreak: number; // Días consecutivos sin strikes
    longestStreak: number;
    lastStrikeDate?: string;
}
