/**
 * Level Rewards Configuration
 * Defines bonus points awarded when reaching specific levels
 * Rewards are moderate to not disrupt normal activity progression
 */

export interface LevelReward {
    level: number;
    bonusPoints: number;
    title: string;
}

/**
 * Level rewards from 1 to 50 (max level)
 * Progression is balanced to provide meaningful milestones without
 * overwhelming the core activity-based point system
 */
export const LEVEL_REWARDS: LevelReward[] = [
    // Levels 1-10: Aprendiz (Beginner rewards)
    { level: 1, bonusPoints: 0, title: 'Aprendiz' },
    { level: 2, bonusPoints: 100, title: 'Aprendiz' },
    { level: 3, bonusPoints: 150, title: 'Aprendiz' },
    { level: 4, bonusPoints: 200, title: 'Aprendiz' },
    { level: 5, bonusPoints: 300, title: 'Aprendiz' },
    { level: 6, bonusPoints: 350, title: 'Aprendiz' },
    { level: 7, bonusPoints: 400, title: 'Aprendiz' },
    { level: 8, bonusPoints: 450, title: 'Aprendiz' },
    { level: 9, bonusPoints: 500, title: 'Aprendiz' },
    { level: 10, bonusPoints: 600, title: 'Aprendiz' },

    // Levels 11-20: Practicante
    { level: 11, bonusPoints: 650, title: 'Practicante' },
    { level: 12, bonusPoints: 700, title: 'Practicante' },
    { level: 13, bonusPoints: 750, title: 'Practicante' },
    { level: 14, bonusPoints: 800, title: 'Practicante' },
    { level: 15, bonusPoints: 900, title: 'Practicante' },
    { level: 16, bonusPoints: 950, title: 'Practicante' },
    { level: 17, bonusPoints: 1000, title: 'Practicante' },
    { level: 18, bonusPoints: 1050, title: 'Practicante' },
    { level: 19, bonusPoints: 1100, title: 'Practicante' },
    { level: 20, bonusPoints: 1250, title: 'Practicante' },

    // Levels 21-30: Experto
    { level: 21, bonusPoints: 1300, title: 'Experto' },
    { level: 22, bonusPoints: 1350, title: 'Experto' },
    { level: 23, bonusPoints: 1400, title: 'Experto' },
    { level: 24, bonusPoints: 1450, title: 'Experto' },
    { level: 25, bonusPoints: 1600, title: 'Experto' },
    { level: 26, bonusPoints: 1650, title: 'Experto' },
    { level: 27, bonusPoints: 1700, title: 'Experto' },
    { level: 28, bonusPoints: 1750, title: 'Experto' },
    { level: 29, bonusPoints: 1800, title: 'Experto' },
    { level: 30, bonusPoints: 2000, title: 'Experto' },

    // Levels 31-40: Maestro
    { level: 31, bonusPoints: 2100, title: 'Maestro' },
    { level: 32, bonusPoints: 2200, title: 'Maestro' },
    { level: 33, bonusPoints: 2300, title: 'Maestro' },
    { level: 34, bonusPoints: 2400, title: 'Maestro' },
    { level: 35, bonusPoints: 2600, title: 'Maestro' },
    { level: 36, bonusPoints: 2700, title: 'Maestro' },
    { level: 37, bonusPoints: 2800, title: 'Maestro' },
    { level: 38, bonusPoints: 2900, title: 'Maestro' },
    { level: 39, bonusPoints: 3000, title: 'Maestro' },
    { level: 40, bonusPoints: 3300, title: 'Maestro' },

    // Levels 41-50: Leyenda
    { level: 41, bonusPoints: 3400, title: 'Leyenda' },
    { level: 42, bonusPoints: 3500, title: 'Leyenda' },
    { level: 43, bonusPoints: 3600, title: 'Leyenda' },
    { level: 44, bonusPoints: 3700, title: 'Leyenda' },
    { level: 45, bonusPoints: 4000, title: 'Leyenda' },
    { level: 46, bonusPoints: 4200, title: 'Leyenda' },
    { level: 47, bonusPoints: 4400, title: 'Leyenda' },
    { level: 48, bonusPoints: 4600, title: 'Leyenda' },
    { level: 49, bonusPoints: 4800, title: 'Leyenda' },
    { level: 50, bonusPoints: 5000, title: 'Leyenda' }, // Max level
];

export const MAX_LEVEL = 50;

/**
 * Get the reward configuration for a specific level
 */
export function getLevelReward(level: number): LevelReward | undefined {
    return LEVEL_REWARDS.find(r => r.level === level);
}

/**
 * Get the title for a specific level
 */
export function getLevelTitle(level: number): string {
    const cappedLevel = Math.min(level, MAX_LEVEL);
    const reward = LEVEL_REWARDS.find(r => r.level === cappedLevel);
    return reward?.title || 'Aprendiz';
}

/**
 * Check if level has reached maximum
 */
export function isMaxLevel(level: number): boolean {
    return level >= MAX_LEVEL;
}
