export const LEVEL_BASE_XP = 1000;
export const LEVEL_INCREMENT_XP = 500;
export const MAX_LEVEL = 50;

/**
 * Calculates the total XP required to reach a specific level.
 * Formula: Total XP = (Level - 1) * BASE_XP + + (Level - 1) * (Level - 2) / 2 * INCREMENT_XP
 * 
 * Examples:
 * Level 1: 0 XP
 * Level 2: 1000 XP
 * Level 3: 1000 + 1500 = 2500 XP
 * Level 4: 1000 + 1500 + 2000 = 4500 XP
 * 
 * @param level The target level
 * @returns Total accumulated XP required
 */
export const getXpRequiredForLevel = (level: number): number => {
    if (level <= 1) return 0;

    // For n levels, we need base_xp for each step, plus the increment (0 for first step, 1 for second, etc.)
    const steps = level - 1;
    const baseTotal = steps * LEVEL_BASE_XP;

    // The sum of increments: 0 + 1 + 2 + ... + (steps - 1) = (steps - 1) * steps / 2
    // multiplied by the INCREMENT_XP
    const incrementTotal = (steps > 1) ? ((steps - 1) * steps / 2) * LEVEL_INCREMENT_XP : 0;

    return baseTotal + incrementTotal;
};

/**
 * Calculates the user's level based on their total accumulated XP.
 * 
 * @param xp Total accumulated XP
 * @returns The user's level (capped at MAX_LEVEL)
 */
export const getLevelFromXp = (xp: number): number => {
    if (xp === undefined || xp === null || xp < 0) return 1;

    let level = 1;
    while (level < MAX_LEVEL && xp >= getXpRequiredForLevel(level + 1)) {
        level++;
    }
    return level;
};

/**
 * Calculates the progress towards the next level.
 * 
 * @param xp Total accumulated XP
 * @returns An object containing currentLevel, currentLevelXp, xpForNextLevel, and progress percentage
 */
export const getLevelProgress = (xp: number) => {
    const currentLevel = getLevelFromXp(xp);

    if (currentLevel >= MAX_LEVEL) {
        return {
            currentLevel: MAX_LEVEL,
            currentLevelXp: 0,
            xpForNextLevel: 0,
            progress: 100,
            xpRequiredForCurrentLevel: getXpRequiredForLevel(MAX_LEVEL)
        };
    }

    const xpRequiredForCurrentLevel = getXpRequiredForLevel(currentLevel);
    const totalXpRequiredForNextLevel = getXpRequiredForLevel(currentLevel + 1);

    // How much XP the user has earned *since* reaching their current level
    const currentLevelXp = xp - xpRequiredForCurrentLevel;

    // How much XP in total is needed to complete this specific level
    const xpForNextLevel = totalXpRequiredForNextLevel - xpRequiredForCurrentLevel;

    // Percentage progress
    const progress = Math.min(100, Math.max(0, (currentLevelXp / xpForNextLevel) * 100));

    return {
        currentLevel,
        currentLevelXp,
        xpForNextLevel,
        progress,
        xpRequiredForCurrentLevel
    };
};
