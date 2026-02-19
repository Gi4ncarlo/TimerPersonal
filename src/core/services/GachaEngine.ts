// Pure Gacha Engine - No side effects, no DB access
// Handles: RNG resolution, cost calculation, prize pool definition, multiplier math
import { GachaPrize, PrizeRarity, ActiveBuff, Action } from '../types';

// ─── Constants ───────────────────────────────────────────────
const BASE_SPIN_COST = 5000;
const INFLATION_RATE = 0.25; // 25% compounding
const BUFF_DURATION_HOURS = 12;
const MULTIPLIER_HARD_CAP = 4.0;
const FREE_SPIN_COOLDOWN_DAYS = 7;

// ─── Prize Pool Definition ──────────────────────────────────
interface PrizeDefinition {
    rarity: PrizeRarity;
    weight: number; // Probability weight (sums to 100)
    key: string;
    label: string;
    type: 'points' | 'multiplier';
    pointsAwarded: number;
    multiplierValue?: number;
    multiplierTarget?: 'global' | 'activity';
    emoji: string;
}

const PRIZE_POOL: PrizeDefinition[] = [
    // Común (54%)
    { rarity: 'common', weight: 20, key: 'common_points', label: '+500 Puntos', type: 'points', pointsAwarded: 500, emoji: '🪙' },
    { rarity: 'common', weight: 25, key: 'common_mult_activity', label: 'x1.2 Actividad Específica', type: 'multiplier', pointsAwarded: 0, multiplierValue: 1.2, multiplierTarget: 'activity', emoji: '📚' },
    { rarity: 'common', weight: 9, key: 'common_mult_global', label: 'x1.1 Global', type: 'multiplier', pointsAwarded: 0, multiplierValue: 1.1, multiplierTarget: 'global', emoji: '🌍' },

    // Raro (25%)
    { rarity: 'rare', weight: 5, key: 'rare_points', label: '+2,500 Puntos', type: 'points', pointsAwarded: 2500, emoji: '💰' },
    { rarity: 'rare', weight: 15, key: 'rare_mult_activity', label: 'x1.5 Actividad Específica', type: 'multiplier', pointsAwarded: 0, multiplierValue: 1.5, multiplierTarget: 'activity', emoji: '🎯' },
    { rarity: 'rare', weight: 5, key: 'rare_mult_global', label: 'x1.3 Global', type: 'multiplier', pointsAwarded: 0, multiplierValue: 1.3, multiplierTarget: 'global', emoji: '🌟' },

    // Épico (15%)
    { rarity: 'epic', weight: 5, key: 'epic_refund', label: 'Tirada Gratis', type: 'points', pointsAwarded: 5000, emoji: '🔄' }, // Refund value approx 5000
    { rarity: 'epic', weight: 8, key: 'epic_mult_activity', label: 'x2.0 Actividad Específica', type: 'multiplier', pointsAwarded: 0, multiplierValue: 2.0, multiplierTarget: 'activity', emoji: '🚀' },
    { rarity: 'epic', weight: 2, key: 'epic_mult_global', label: 'x1.5 Global', type: 'multiplier', pointsAwarded: 0, multiplierValue: 1.5, multiplierTarget: 'global', emoji: '⚡' },

    // Troll (5%)
    { rarity: 'troll', weight: 2.5, key: 'troll_coin', label: '+1 Moneda de la Suerte', type: 'points', pointsAwarded: 1, emoji: '🤡' },
    { rarity: 'troll', weight: 2.5, key: 'troll_mult', label: 'x1.01 Mejor que nada', type: 'multiplier', pointsAwarded: 0, multiplierValue: 1.01, multiplierTarget: 'global', emoji: '🃏' },

    // Legendario (1%)
    { rarity: 'legendary', weight: 0.2, key: 'legendary_chest', label: 'Cofre Mayor: +10,000 Puntos', type: 'points', pointsAwarded: 10000, emoji: '👑' },
    { rarity: 'legendary', weight: 0.6, key: 'legendary_mult_activity', label: 'x3.0 Actividad Específica', type: 'multiplier', pointsAwarded: 0, multiplierValue: 3.0, multiplierTarget: 'activity', emoji: '🔥' },
    { rarity: 'legendary', weight: 0.2, key: 'legendary_mult_global', label: 'x2.5 Global', type: 'multiplier', pointsAwarded: 0, multiplierValue: 2.5, multiplierTarget: 'global', emoji: '💎' },
];

// ─── Rarity Colors & Display ────────────────────────────────
const RARITY_CONFIG: Record<PrizeRarity, { color: string; glow: string; bgGradient: string; label: string }> = {
    common: { color: '#a0a0a0', glow: '0 0 20px rgba(160,160,160,0.5)', bgGradient: 'linear-gradient(135deg, #2a2a2a, #3a3a3a)', label: 'Común' },
    rare: { color: '#4da6ff', glow: '0 0 30px rgba(77,166,255,0.6)', bgGradient: 'linear-gradient(135deg, #1a2a4a, #2a3a5a)', label: 'Raro' },
    epic: { color: '#b44dff', glow: '0 0 40px rgba(180,77,255,0.7)', bgGradient: 'linear-gradient(135deg, #2a1a4a, #3a2a5a)', label: 'Épico' },
    troll: { color: '#ff6b6b', glow: '0 0 20px rgba(255,107,107,0.5)', bgGradient: 'linear-gradient(135deg, #3a1a1a, #4a2a2a)', label: 'Troll' },
    legendary: { color: '#ffd700', glow: '0 0 50px rgba(255,215,0,0.8)', bgGradient: 'linear-gradient(135deg, #3a2a0a, #4a3a1a)', label: 'Legendario' },
};

export class GachaEngine {
    /**
     * Calculate spin cost based on how many spins were already done today.
     * Base: 5000, +25% compounding per spin.
     * Uses Math.ceil() to avoid decimals.
     */
    static calculateSpinCost(spinsToday: number): number {
        return Math.ceil(BASE_SPIN_COST * Math.pow(1 + INFLATION_RATE, spinsToday));
    }

    /**
     * Check if the user's weekly free spin is available.
     * Resets every 7 days from when it was last used.
     */
    static isFreeSpin(freeSpinAvailable: boolean, freeSpinUsedAt: string | null): boolean {
        if (freeSpinAvailable) return true;
        if (!freeSpinUsedAt) return true;

        const usedDate = new Date(freeSpinUsedAt);
        const now = new Date();
        const diffDays = (now.getTime() - usedDate.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays >= FREE_SPIN_COOLDOWN_DAYS;
    }

    /**
     * Check if the daily spin count should be reset.
     * Returns true if lastSpinDate is different from today (Argentina TZ).
     */
    static shouldResetDaily(lastSpinDate: string | null, todayStr: string): boolean {
        if (!lastSpinDate) return true;
        return lastSpinDate !== todayStr;
    }

    /**
     * Resolve the RNG and return a prize.
     * Uses weighted random selection from the prize pool.
     * 
     * Resolve the RNG and return a prize.
     * Uses weighted random selection from the prize pool.
     * 
     * @param positiveActions - Available positive actions, sorted by usage frequency (ASC) to prioritize least used.
     */
    static resolveRNG(positiveActions: Action[] = []): GachaPrize {
        const totalWeight = PRIZE_POOL.reduce((sum, p) => sum + p.weight, 0);
        let roll = Math.random() * totalWeight;

        let selected = PRIZE_POOL[0]; // fallback
        for (const prize of PRIZE_POOL) {
            roll -= prize.weight;
            if (roll <= 0) {
                selected = prize;
                break;
            }
        }

        // If it's an activity-specific multiplier, pick a random positive action
        // Logic: Favor least used activities (first in array).
        // 70% chance: Pick from top 30% least used.
        // 30% chance: Pick from remaining 70% most used.
        let actionName: string | undefined;
        if (selected.multiplierTarget === 'activity' && positiveActions.length > 0) {

            // Assume positiveActions is sorted by usage usage ASC (least used first)
            const cutoffIndex = Math.ceil(positiveActions.length * 0.3); // Top 30%
            const isLucky = Math.random() < 0.7; // 70% chance to pick uncommon activity

            let pool = [];
            if (isLucky && cutoffIndex > 0) {
                pool = positiveActions.slice(0, cutoffIndex);
            } else {
                pool = positiveActions.slice(cutoffIndex);
            }

            // Fallback if pool is empty (e.g. only 1 action total)
            if (pool.length === 0) pool = positiveActions;

            const randomAction = pool[Math.floor(Math.random() * pool.length)];
            actionName = randomAction.name;
        }

        return {
            rarity: selected.rarity,
            key: selected.key,
            label: actionName ? `x${selected.multiplierValue} ${actionName}` : selected.label,
            type: selected.type,
            pointsAwarded: selected.pointsAwarded,
            multiplierValue: selected.multiplierValue,
            multiplierTarget: selected.multiplierTarget,
            actionName,
        };
    }

    /**
     * Calculate the effective multiplier for a given action,
     * considering all active (non-expired) buffs.
     * 
     * Global buffs apply to all positive activities.
     * Activity-specific buffs only apply to their action.
     * 
     * Stacking is ADDITIVE: base 1.0 + sum of (multiplier - 1.0) for each buff.
     * Hard cap: 4.0x
     */
    static calculateEffectiveMultiplier(
        buffs: ActiveBuff[],
        actionId?: string,
        now: Date = new Date()
    ): number {
        const activeBuffs = buffs.filter(b => new Date(b.expiresAt) > now);

        let totalBonus = 0;

        for (const buff of activeBuffs) {
            if (buff.buffType === 'global') {
                totalBonus += (buff.multiplier - 1.0);
            } else if (buff.buffType === 'activity' && actionId && buff.actionId === actionId) {
                totalBonus += (buff.multiplier - 1.0);
            }
        }

        // Base multiplier is 1.0, add bonuses, cap at HARD_CAP
        const effective = Math.min(1.0 + totalBonus, MULTIPLIER_HARD_CAP);
        return Math.round(effective * 100) / 100; // Avoid floating point noise
    }

    /**
     * Generate the buff expiration timestamp (12 hours from now).
     */
    static generateBuffExpiry(): string {
        const expires = new Date();
        expires.setHours(expires.getHours() + BUFF_DURATION_HOURS);
        return expires.toISOString();
    }

    /**
     * Get full prize pool for display purposes.
     */
    static getPrizePool(): PrizeDefinition[] {
        return [...PRIZE_POOL];
    }

    /**
     * Get rarity display config.
     */
    static getRarityConfig(rarity: PrizeRarity) {
        return RARITY_CONFIG[rarity];
    }

    /**
     * Get all rarity configs.
     */
    static getAllRarityConfigs() {
        return { ...RARITY_CONFIG };
    }

    /**
     * Get the base cost constant.
     */
    static getBaseCost(): number {
        return BASE_SPIN_COST;
    }

    /**
     * Get buff duration in hours.
     */
    static getBuffDurationHours(): number {
        return BUFF_DURATION_HOURS;
    }

    /**
     * Get hard cap.
     */
    static getHardCap(): number {
        return MULTIPLIER_HARD_CAP;
    }
}
