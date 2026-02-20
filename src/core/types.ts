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
    pointsBefore?: number;
    pointsDeducted?: number;
    balanceAfter?: number;
}

export interface StrikeStats {
    totalStrikes: number;
    currentStreak: number; // Días consecutivos sin strikes
    longestStreak: number;
    lastStrikeDate?: string;
}

export interface VacationPeriod {
    id: string;
    userId: string;
    startDate: string;      // YYYY-MM-DD
    endDate: string;         // YYYY-MM-DD
    reason: string;
    createdAt: string;       // ISO datetime
    notifiedStart: boolean;
    notifiedEndWarning: boolean;
}

// Daily Missions System
export type MissionType = 'threshold_positive' | 'limit_negative' | 'consistency';
export type MissionDifficulty = 'easy' | 'medium' | 'hard';
export type MissionStatus = 'in_progress' | 'completed' | 'failed';

export interface DailyMission {
    id: string;
    userId: string;
    date: string;
    missionType: MissionType;
    difficulty: MissionDifficulty;
    title: string;
    description: string;
    targetValue: number;
    currentValue: number;
    actionId?: string;
    status: MissionStatus;
    rewardPoints: number;
    completedAt?: string;
}

// Smart Notifications System
export type SarcasmLevel = 'low' | 'medium' | 'brutal';
export type NotificationType =
    | 'inactivity' | 'ranking_drop' | 'streak_danger' | 'weekly_decline'
    | 'streak_milestone' | 'comeback' | 'achievement'
    | 'personal_record' | 'goal_progress' | 'competitive_taunt'
    | 'consistency_praise' | 'hourly_nudge' | 'best_day_reminder';

export interface SmartNotification {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    context: Record<string, any>;
    isRead: boolean;
    createdAt: string;
}

// Gacha Roulette System
export type PrizeRarity = 'common' | 'rare' | 'epic' | 'troll' | 'legendary';

export interface GachaState {
    id: string;
    userId: string;
    spinsToday: number;
    lastSpinDate: string | null; // YYYY-MM-DD
    freeSpinAvailable: boolean;
    freeSpinUsedAt: string | null; // ISO datetime
}

export interface ActiveBuff {
    id: string;
    userId: string;
    buffType: 'global' | 'activity';
    actionId: string | null;
    multiplier: number;
    expiresAt: string; // ISO datetime
    source: string;
    createdAt: string;
}

export interface GachaPrize {
    rarity: PrizeRarity;
    key: string;
    label: string;
    type: 'points' | 'multiplier';
    pointsAwarded: number;
    multiplierValue?: number;
    multiplierTarget?: 'global' | 'activity';
    actionName?: string; // For display when activity-specific
}

export interface GachaSpinResult {
    prize: GachaPrize;
    pointsSpent: number;
    wasFreeSpin: boolean;
    newBalance: number;
    buffCreated?: ActiveBuff;
}

export type LeagueTier = 'Bronce' | 'Plata' | 'Oro' | 'Platino' | 'Diamante';

export interface League {
    tier: LeagueTier;
    minPoints: number;
    color: string;
    icon: string;
}

// Shop System
export type ShopItemType = 'utility' | 'attack' | 'defense';

export interface ShopItem {
    id: string;
    name: string;
    description: string;
    cost: number;
    type: ShopItemType;
    icon: string;
    isActive: boolean;
    maxPurchasesPerDay?: number;
    cooldownDays?: number;
}

export interface UserPurchase {
    id: string;
    userId: string;
    itemId: string;
    costPaid: number;
    metadata: Record<string, any>;
    purchasedAt: string;
}

export interface PurchaseResult {
    success: boolean;
    error?: string;
    costPaid?: number;
    strikeRemoved?: string;
    nextCost?: number;
    newBalance?: number;
    nextAvailable?: string;
    balance?: number;
    cost?: number;
}

export const LEAGUE_THRESHOLDS: League[] = [
    { tier: 'Bronce', minPoints: 0, color: '#cd7f32', icon: '🥉' },
    { tier: 'Plata', minPoints: 5000, color: '#c0c0c0', icon: '🥈' },
    { tier: 'Oro', minPoints: 15000, color: '#ffd700', icon: '🥇' },
    { tier: 'Platino', minPoints: 30000, color: '#e5e4e2', icon: '💎' },
    { tier: 'Diamante', minPoints: 100000, color: '#b9f2ff', icon: '💠' },
];
