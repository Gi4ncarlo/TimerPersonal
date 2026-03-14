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
    cosmeticAvatar?: string;
    nameColor?: string;
    nameTitle?: string;
    realAge?: number;
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

export type LeagueTier = 'Bronce' | 'Plata' | 'Oro' | 'Platino' | 'Diamante' | 'Élite';

export interface League {
    tier: LeagueTier;
    minPoints: number;
    color: string;
    imgUrl: string;
}

// Shop System
export type ShopItemType = 'utility' | 'attack' | 'defense';
export type ShopItemCategory = 'utility' | 'cosmetic' | 'offensive' | 'defensive';

export interface ShopItem {
    id: string;
    name: string;
    description: string;
    cost: number;
    type: ShopItemType;
    icon: string;
    isActive: boolean;
    metadata?: Record<string, any>;
    maxPurchasesPerDay?: number;
    cooldownDays?: number;
}

export interface UserActivePower {
    id: string;
    userId: string;
    targetUserId: string | null;
    powerType: 'escudo' | 'boveda' | 'seguro_racha' | 'parasito_agresivo' | 'parasito_lento' | 'sabotaje' | 'jupiter_ray';
    expiresAt: string;
    attackerId: string | null;
    metadata: Record<string, any>;
    createdAt: string;
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
    bonus?: number;
}

// Weekly Summary System
export interface WeeklySummary {
    id: string;
    userId: string;
    weekStart: string; // YYYY-MM-DD (Monday)
    weekEnd: string;   // YYYY-MM-DD (Sunday)
    totalPoints: number;
    totalActivities: number;
    totalStrikes: number;
    bestDayName: string | null;
    bestDayPoints: number;
    mostFrequentAction: string | null;
    mostFrequentCount: number;
    leaderboardPosition: number | null;
    dailyBreakdown: Record<string, number>; // { "Lun": 120, "Mar": 450, ... }
    strikeDays: string[]; // ["2026-02-25", ...]
    createdAt: string;
}

// Tournament System
export type TournamentCategory = 'fitness' | 'reading' | 'productivity' | 'discipline' | 'total';

export interface Tournament {
    id: string;
    weekStart: string;      // YYYY-MM-DD (Monday)
    weekEnd: string;        // YYYY-MM-DD (Sunday)
    category: TournamentCategory;
    title: string;
    emoji: string;
    description: string;
    status: 'active' | 'completed';
    winnerId?: string;
    winnerUsername?: string;
    rewardMultiplier: number;    // 1.5 default
    rewardDurationHours: number; // 48 default
    createdAt: string;
}

export interface TournamentParticipant {
    id: string;
    tournamentId: string;
    userId: string;
    username: string;
    score: number;
    rank: number;
}

export const LEAGUE_THRESHOLDS: League[] = [
    { tier: 'Bronce', minPoints: 0, color: '#cd7f32', imgUrl: '/images/bronce-sinfondo.webp' },
    { tier: 'Plata', minPoints: 35000, color: '#c0c0c0', imgUrl: '/images/plata-sinfondo.webp' },
    { tier: 'Oro', minPoints: 150000, color: '#ffd700', imgUrl: '/images/oro-sinfondo.webp' },
    { tier: 'Platino', minPoints: 450000, color: '#e5e4e2', imgUrl: '/images/platino-sinfondo.webp' },
    { tier: 'Diamante', minPoints: 1000000, color: '#b9f2ff', imgUrl: '/images/diamante-sinfondo.webp' },
    { tier: 'Élite', minPoints: 2500000, color: '#8a2be2', imgUrl: '/images/elite-sinfondo.webp' },
];

// Dopamine Age System
export interface DopamineAgeSurvey {
    sleepHours: number;
    screenTimeHours: number;
    exerciseFrequency: number;
    socialMediaUsage: 'low' | 'medium' | 'high' | 'extreme';
    dietQuality: 'poor' | 'average' | 'good' | 'excellent';
    stressLevel: 1 | 2 | 3 | 4 | 5;
    realAge: number;
}

export interface DopamineAge {
    userId: string;
    realAge: number;
    dopamineAge: number;
    delta: number;
    weeklyDelta?: number | null;
    status: 'optimal' | 'good' | 'warning' | 'critical';
    lastCalculatedAt: string;
    surveyCompleted: boolean;
    surveyAnswers?: DopamineAgeSurvey;
}

export interface HistoryPoint {
    date: string;
    dopamineAge: number;
    status: DopamineAge['status'];
}

