// Pure service - No side effects, no DB calls
// Handles mission generation, progress calculation, and difficulty scaling
import { Action, DailyRecord, DailyMission, MissionType, MissionDifficulty } from '../types';

// ─── Mission Template ───────────────────────────────────────────────
interface MissionTemplate {
    missionType: MissionType;
    titleTemplate: string;        // Uses {action} and {value} placeholders
    descriptionTemplate: string;
    /** For threshold/limit types, these are minutes. For consistency, these are activity counts. */
    targets: Record<MissionDifficulty, number>;
    rewards: Record<MissionDifficulty, number>;
    /** If true, template picks a random action of matching type at generation time */
    requiresAction: boolean;
    /** For action-based templates: 'positive' or 'negative' */
    actionFilter?: 'positive' | 'negative';
}

// ─── Static Mission Pool ────────────────────────────────────────────
const MISSION_TEMPLATES: MissionTemplate[] = [
    // THRESHOLD POSITIVE: "Log at least X minutes of {action}"
    {
        missionType: 'threshold_positive',
        titleTemplate: '{action} - {value} min',
        descriptionTemplate: 'Registrar al menos {value} minutos de {action}',
        targets: { easy: 30, medium: 60, hard: 120 },
        rewards: { easy: 200, medium: 500, hard: 1000 },
        requiresAction: true,
        actionFilter: 'positive',
    },
    {
        missionType: 'threshold_positive',
        titleTemplate: 'Maratón de {action}',
        descriptionTemplate: 'Acumular al menos {value} minutos de {action} hoy',
        targets: { easy: 45, medium: 90, hard: 180 },
        rewards: { easy: 250, medium: 550, hard: 1100 },
        requiresAction: true,
        actionFilter: 'positive',
    },

    // LIMIT NEGATIVE: "Don't exceed X minutes on {action}"
    {
        missionType: 'limit_negative',
        titleTemplate: 'Control de {action}',
        descriptionTemplate: 'No superar {value} minutos de {action}',
        targets: { easy: 120, medium: 60, hard: 30 },
        rewards: { easy: 200, medium: 500, hard: 1000 },
        requiresAction: true,
        actionFilter: 'negative',
    },
    {
        missionType: 'limit_negative',
        titleTemplate: '{action} bajo control',
        descriptionTemplate: 'Mantener {action} por debajo de {value} min',
        targets: { easy: 90, medium: 45, hard: 15 },
        rewards: { easy: 250, medium: 550, hard: 1100 },
        requiresAction: true,
        actionFilter: 'negative',
    },

    // CONSISTENCY: "Log N different activities"
    {
        missionType: 'consistency',
        titleTemplate: 'Variedad Productiva',
        descriptionTemplate: 'Registrar al menos {value} actividades distintas hoy',
        targets: { easy: 2, medium: 3, hard: 5 },
        rewards: { easy: 200, medium: 500, hard: 1000 },
        requiresAction: false,
    },
    {
        missionType: 'consistency',
        titleTemplate: 'Día Diverso',
        descriptionTemplate: 'Completar al menos {value} actividades diferentes',
        targets: { easy: 2, medium: 4, hard: 6 },
        rewards: { easy: 250, medium: 450, hard: 900 },
        requiresAction: false,
    },
];

// ─── Engine ─────────────────────────────────────────────────────────
export class DailyMissionEngine {

    /**
     * Determine difficulty based on the user's recent win streak.
     * 0-2 consecutive days with all missions completed → easy
     * 3-5 → medium
     * 6+  → hard
     */
    static getDifficultyForStreak(streakDays: number): MissionDifficulty {
        if (streakDays >= 6) return 'hard';
        if (streakDays >= 3) return 'medium';
        return 'easy';
    }

    /**
     * Generate 3 daily missions — one per type, no repeats.
     * @param actions  All user actions (to pick random ones for templates)
     * @param date     YYYY-MM-DD
     * @param userId   UUID
     * @param streakDays Number of consecutive days with all missions completed
     */
    static generateDailyMissions(
        actions: Action[],
        date: string,
        userId: string,
        streakDays: number = 0,
    ): Omit<DailyMission, 'id'>[] {
        const difficulty = this.getDifficultyForStreak(streakDays);
        // Shuffle types to ensure variety, then pick up to 2
        const allTypes: MissionType[] = ['threshold_positive', 'limit_negative', 'consistency'];
        const missionTypes = allTypes.sort(() => 0.5 - Math.random());

        const positiveActions = actions.filter(a => a.type === 'positive');
        const negativeActions = actions.filter(a => a.type === 'negative');

        const missions: Omit<DailyMission, 'id'>[] = [];

        for (const type of missionTypes) {
            // Stop if we already have 2 missions
            if (missions.length >= 2) break;

            const candidates = MISSION_TEMPLATES.filter(t => t.missionType === type);
            const template = candidates[Math.floor(Math.random() * candidates.length)];

            let actionId: string | undefined;
            let actionName = '';

            if (template.requiresAction) {
                const pool = template.actionFilter === 'positive' ? positiveActions : negativeActions;
                if (pool.length === 0) continue; // skip if no actions of this type exist
                const picked = pool[Math.floor(Math.random() * pool.length)];
                actionId = picked.id;
                actionName = picked.name;
            }

            const targetValue = template.targets[difficulty];
            const rewardPoints = template.rewards[difficulty];

            const title = template.titleTemplate
                .replace('{action}', actionName)
                .replace('{value}', String(targetValue));

            const description = template.descriptionTemplate
                .replace('{action}', actionName)
                .replace('{value}', String(targetValue));

            missions.push({
                userId,
                date,
                missionType: type,
                difficulty,
                title,
                description,
                targetValue,
                currentValue: 0,
                actionId,
                status: 'in_progress',
                rewardPoints,
            });
        }

        return missions;
    }

    /**
     * Calculate progress for a single mission based on today's records.
     * Returns updated { currentValue, status }.
     */
    static checkMissionProgress(
        mission: DailyMission,
        todayRecords: DailyRecord[],
    ): { currentValue: number; status: DailyMission['status'] } {


        let currentValue = 0;

        switch (mission.missionType) {
            case 'threshold_positive': {
                // Sum minutes for the specific positive action today
                currentValue = todayRecords
                    .filter(r => r.actionId === mission.actionId)
                    .reduce((sum, r) => sum + r.durationMinutes, 0);

                const status = currentValue >= mission.targetValue ? 'completed' : 'in_progress';
                return { currentValue, status };
            }

            case 'limit_negative': {
                // Sum minutes for the specific negative action today
                currentValue = todayRecords
                    .filter(r => r.actionId === mission.actionId)
                    .reduce((sum, r) => sum + r.durationMinutes, 0);

                // Failed if exceeded threshold
                if (currentValue > mission.targetValue) {
                    return { currentValue, status: 'failed' };
                }
                // Still "in_progress" — can only truly be "completed" at end of day
                // But we show visual progress inversely
                return { currentValue, status: 'in_progress' };
            }

            case 'consistency': {
                // Count unique action IDs today
                const uniqueActions = new Set(todayRecords.map(r => r.actionId));
                currentValue = uniqueActions.size;

                const status = currentValue >= mission.targetValue ? 'completed' : 'in_progress';
                return { currentValue, status };
            }

            default:
                return { currentValue: 0, status: 'in_progress' };
        }
    }

    /**
     * Check all missions and return the ones that changed status.
     */
    static checkAllMissions(
        missions: DailyMission[],
        todayRecords: DailyRecord[],
    ): { mission: DailyMission; newValue: number; newStatus: DailyMission['status']; changed: boolean }[] {
        return missions.map(m => {
            const { currentValue, status } = this.checkMissionProgress(m, todayRecords);
            const changed = currentValue !== m.currentValue || status !== m.status;
            return { mission: m, newValue: currentValue, newStatus: status, changed };
        });
    }
}
