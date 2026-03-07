// Pure Tournament Engine - No side effects, no DB access
// Handles: Category rotation, score calculation, winner determination, reward config
import { Action, DailyRecord, TournamentCategory, Tournament, TournamentParticipant } from '../types';

// ─── Category Configuration ──────────────────────────────────

interface CategoryConfig {
    category: TournamentCategory;
    title: string;
    emoji: string;
    description: string;
    /** Action names that count for this category */
    actionNames: string[];
    /** How to score: 'points' = sum pointsCalculated, 'metric' = sum metricValue, 'inverse_negative' = fewer negatives = better */
    scoringMode: 'points' | 'metric' | 'inverse_negative';
    /** Whether the buff applies globally or only to specific actions */
    rewardTarget: 'global' | 'activity';
}

const TOURNAMENT_CATEGORIES: CategoryConfig[] = [
    {
        category: 'fitness',
        title: 'Torneo Fitness',
        emoji: '🏋️',
        description: 'El que más puntos acumule con actividad física gana. ¡A mover el cuerpo!',
        actionNames: ['Correr', 'Actividad Física general'],
        scoringMode: 'points',
        rewardTarget: 'activity',
    },
    {
        category: 'reading',
        title: 'Torneo de Lectura',
        emoji: '📚',
        description: 'El que más páginas lea durante la semana se lleva el premio. ¡A leer!',
        actionNames: ['Leer'],
        scoringMode: 'metric',
        rewardTarget: 'activity',
    },
    {
        category: 'productivity',
        title: 'Torneo de Productividad',
        emoji: '💼',
        description: 'Trabajar y estudiar suman. El más productivo gana el torneo.',
        actionNames: ['Trabajar activamente', 'Estudiar'],
        scoringMode: 'points',
        rewardTarget: 'activity',
    },
    {
        category: 'discipline',
        title: 'Torneo de Disciplina',
        emoji: '🧘',
        description: 'El que menos actividades negativas haga gana. ¡Autocontrol es poder!',
        actionNames: [], // All negatives count (inversely)
        scoringMode: 'inverse_negative',
        rewardTarget: 'global',
    },
    {
        category: 'total',
        title: 'Torneo Total',
        emoji: '⚡',
        description: 'Todos los puntos positivos suman. El que más productivo sea, gana.',
        actionNames: [], // All positive actions count
        scoringMode: 'points',
        rewardTarget: 'global',
    },
];

// ─── Reward Tiers (Top 3 podium) ──────────────────────────────────

interface RewardTier {
    rank: number;
    multiplier: number;
    durationHours: number;
    label: string;
    emoji: string;
}

const REWARD_TIERS: RewardTier[] = [
    { rank: 1, multiplier: 1.5, durationHours: 48, label: '1er Lugar', emoji: '🥇' },
    { rank: 2, multiplier: 1.3, durationHours: 24, label: '2do Lugar', emoji: '🥈' },
    { rank: 3, multiplier: 1.15, durationHours: 24, label: '3er Lugar', emoji: '🥉' },
];

// ─── Engine ──────────────────────────────────

export class TournamentEngine {

    /**
     * Deterministically select a category based on the week start date.
     * Uses ISO week number mod category count for rotation.
     */
    static getCategoryForWeek(weekStart: string): TournamentCategory {
        const date = new Date(weekStart + 'T12:00:00');
        // Calculate ISO week number
        const tempDate = new Date(date.valueOf());
        const dayNum = (date.getDay() + 6) % 7;
        tempDate.setDate(tempDate.getDate() - dayNum + 3);
        const firstThursday = tempDate.valueOf();
        tempDate.setMonth(0, 1);
        if (tempDate.getDay() !== 4) {
            tempDate.setMonth(0, 1 + ((4 - tempDate.getDay()) + 7) % 7);
        }
        const weekNumber = 1 + Math.ceil((firstThursday - tempDate.valueOf()) / (7 * 24 * 60 * 60 * 1000));

        const index = weekNumber % TOURNAMENT_CATEGORIES.length;
        return TOURNAMENT_CATEGORIES[index].category;
    }

    /**
     * Get the full configuration for a category.
     */
    static getCategoryConfig(category: TournamentCategory): CategoryConfig {
        return TOURNAMENT_CATEGORIES.find(c => c.category === category) || TOURNAMENT_CATEGORIES[0];
    }

    /**
     * Build a tournament definition for a given week.
     */
    static buildTournamentDefinition(weekStart: string, weekEnd: string): Omit<Tournament, 'id' | 'createdAt'> {
        const category = this.getCategoryForWeek(weekStart);
        const config = this.getCategoryConfig(category);

        return {
            weekStart,
            weekEnd,
            category,
            title: config.title,
            emoji: config.emoji,
            description: config.description,
            status: 'active',
            rewardMultiplier: REWARD_TIERS[0].multiplier,
            rewardDurationHours: REWARD_TIERS[0].durationHours,
        };
    }

    /**
     * Calculate a participant's score for the current tournament.
     * 
     * @param records - The user's records for the tournament week
     * @param actions - All available actions (to determine type)
     * @param category - The tournament category
     * @returns Numeric score (higher is better)
     */
    static calculateParticipantScore(
        records: DailyRecord[],
        actions: Action[],
        category: TournamentCategory
    ): number {
        const config = this.getCategoryConfig(category);
        const actionMap = new Map(actions.map(a => [a.id, a]));

        switch (config.scoringMode) {
            case 'points': {
                // Sum pointsCalculated for matching action names
                const targetNames = config.actionNames.length > 0
                    ? new Set(config.actionNames)
                    : null; // null = all positive actions

                return records.reduce((sum, record) => {
                    const action = actionMap.get(record.actionId);
                    if (!action || action.type !== 'positive') return sum;
                    if (targetNames && !targetNames.has(record.actionName)) return sum;
                    return sum + Math.max(0, record.pointsCalculated);
                }, 0);
            }

            case 'metric': {
                // Sum metricValue for matching action names (e.g., pages read)
                const targetNames = new Set(config.actionNames);
                return records.reduce((sum, record) => {
                    if (!targetNames.has(record.actionName)) return sum;
                    return sum + (record.metricValue || 0);
                }, 0);
            }

            case 'inverse_negative': {
                // Fewer negative points = higher score
                // Score = BASE_SCORE - abs(negative points)
                // This ensures people with 0 negative activity get the highest score
                const BASE_SCORE = 100000;
                const totalNegative = records.reduce((sum, record) => {
                    const action = actionMap.get(record.actionId);
                    if (!action || action.type !== 'negative') return sum;
                    return sum + Math.abs(record.pointsCalculated);
                }, 0);
                return Math.max(0, BASE_SCORE - totalNegative);
            }

            default:
                return 0;
        }
    }

    /**
     * Determine winners by sorting participants by score descending.
     * Returns participants sorted by rank (1 = highest score).
     */
    static rankParticipants(participants: { userId: string; username: string; score: number }[]): TournamentParticipant[] {
        return [...participants]
            .sort((a, b) => b.score - a.score)
            .map((p, index) => ({
                id: '', // Will be set by DB
                tournamentId: '', // Will be set by caller
                userId: p.userId,
                username: p.username,
                score: p.score,
                rank: index + 1,
            }));
    }

    /**
     * Get the reward tier for a given rank.
     * Returns undefined if rank is not in top 3.
     */
    static getRewardTier(rank: number): RewardTier | undefined {
        return REWARD_TIERS.find(t => t.rank === rank);
    }

    /**
     * Get all reward tiers for display.
     */
    static getAllRewardTiers(): RewardTier[] {
        return [...REWARD_TIERS];
    }

    /**
     * Get the action names that receive the buff reward for a category.
     * Returns empty array if the reward is global.
     */
    static getRewardActionNames(category: TournamentCategory): string[] {
        const config = this.getCategoryConfig(category);
        if (config.rewardTarget === 'global') return [];
        return [...config.actionNames];
    }

    /**
     * Whether the reward for this category is global or activity-specific.
     */
    static isGlobalReward(category: TournamentCategory): boolean {
        return this.getCategoryConfig(category).rewardTarget === 'global';
    }

    /**
     * Get all categories (for display/info purposes).
     */
    static getAllCategories(): CategoryConfig[] {
        return [...TOURNAMENT_CATEGORIES];
    }

    /**
     * Get the scoring unit label for display.
     */
    static getScoringUnit(category: TournamentCategory): string {
        switch (category) {
            case 'reading': return 'páginas';
            case 'discipline': return 'pts. disciplina';
            default: return 'puntos';
        }
    }
}
