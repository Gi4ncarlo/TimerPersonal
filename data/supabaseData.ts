// Supabase Data Store - Replacement for MockDataStore
import { supabase } from '@/lib/supabase/client';
import { Action, DailyRecord, User, Goal } from '@/core/types';

export const SupabaseDataStore = {
    // Authentication
    login: async (username: string, password: string): Promise<User | null> => {
        // For demo using email convention
        const email = `${username}@demo.com`;

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error || !data.user) return null;

        return SupabaseDataStore.getCurrentUser();
    },

    logout: async () => {
        await supabase.auth.signOut();
    },

    getCurrentUser: async (): Promise<User | null> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

        if (!profile) return null;

        return {
            id: profile.id,
            username: profile.username,
            preferences: profile.preferences || {},
            level: profile.level || 1,
            xp: profile.xp || 0,
        };
    },

    updateUserProgress: async (userId: string, xpToAdd: number): Promise<void> => {
        // 1. Get current data
        const { data: user } = await supabase
            .from('users')
            .select('xp, level')
            .eq('id', userId)
            .single();

        if (!user) return;

        const newXp = (user.xp || 0) + xpToAdd;
        // Simple logic: Level = 1 + floor(XP / 1000)
        const newLevel = 1 + Math.floor(newXp / 1000);

        // 2. Update
        await supabase
            .from('users')
            .update({ xp: newXp, level: newLevel })
            .eq('id', userId);
    },

    // Actions
    getActions: async (): Promise<Action[]> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('actions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true });

        if (error || !data) return [];

        return data.map(a => ({
            id: a.id,
            name: a.name,
            type: a.type as 'positive' | 'negative',
            pointsPerMinute: Number(a.points_per_minute),
            metadata: a.metadata,
        }));
    },

    createAction: async (action: Omit<Action, 'id'>): Promise<Action> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('actions')
            .insert({
                user_id: user.id,
                name: action.name,
                type: action.type,
                points_per_minute: action.pointsPerMinute,
                metadata: action.metadata || {},
            })
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            name: data.name,
            type: data.type,
            pointsPerMinute: Number(data.points_per_minute),
            metadata: data.metadata,
        };
    },

    deleteAction: async (id: string): Promise<boolean> => {
        const { error } = await supabase.from('actions').delete().eq('id', id);
        return !error;
    },

    // Records
    getRecords: async (): Promise<DailyRecord[]> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('daily_records')
            .select('*')
            .eq('user_id', user.id)
            .order('date', { ascending: false });

        if (error || !data) return [];

        return data.map(r => ({
            id: r.id,
            actionId: r.action_id,
            actionName: r.action_name,
            date: r.date,
            durationMinutes: r.duration_minutes,
            pointsCalculated: Number(r.points_calculated),
            notes: r.notes,
        }));
    },

    getRecordsByDate: async (date: string): Promise<DailyRecord[]> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('daily_records')
            .select('*')
            .eq('user_id', user.id)
            .eq('date', date)
            .order('created_at', { ascending: true });

        if (error || !data) return [];

        return data.map(r => ({
            id: r.id,
            actionId: r.action_id,
            actionName: r.action_name,
            date: r.date,
            durationMinutes: r.duration_minutes,
            pointsCalculated: Number(r.points_calculated),
            notes: r.notes,
        }));
    },

    getRecordsByDateRange: async (startDate: string, endDate: string): Promise<DailyRecord[]> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('daily_records')
            .select('*')
            .eq('user_id', user.id)
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: true });

        if (error || !data) return [];

        return data.map(r => ({
            id: r.id,
            actionId: r.action_id,
            actionName: r.action_name,
            date: r.date,
            durationMinutes: r.duration_minutes,
            pointsCalculated: Number(r.points_calculated),
            notes: r.notes,
        }));
    },

    createRecord: async (record: Omit<DailyRecord, 'id'>): Promise<DailyRecord> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // 1. Create record
        const { data, error } = await supabase
            .from('daily_records')
            .insert({
                user_id: user.id,
                action_id: record.actionId,
                action_name: record.actionName,
                date: record.date,
                duration_minutes: record.durationMinutes,
                points_calculated: record.pointsCalculated,
                notes: record.notes,
            })
            .select()
            .single();

        if (error) throw error;

        // 2. Update XP if positive
        if (record.pointsCalculated > 0) {
            await SupabaseDataStore.updateUserProgress(user.id, record.durationMinutes);
        }

        // 3. Update Goals
        await SupabaseDataStore.updateGoalsProgress(
            user.id,
            record.actionId,
            record.durationMinutes,
            record.pointsCalculated
        );

        return {
            id: data.id,
            actionId: data.action_id,
            actionName: data.action_name,
            date: data.date,
            durationMinutes: data.duration_minutes,
            pointsCalculated: Number(data.points_calculated),
            notes: data.notes,
        };
    },

    deleteRecord: async (id: string): Promise<boolean> => {
        const { error } = await supabase.from('daily_records').delete().eq('id', id);
        return !error;
    },

    // Goals
    getGoals: async (): Promise<Goal[]> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('goals')
            .select('*')
            .eq('user_id', user.id)
            .order('is_completed', { ascending: true }) // Active first
            .order('created_at', { ascending: false });

        if (error || !data) return [];

        return data.map(g => ({
            id: g.id,
            userId: g.user_id,
            title: g.title,
            type: g.type,
            targetValue: g.target_value,
            currentValue: g.current_value,
            actionId: g.action_id,
            startDate: g.start_date,
            endDate: g.end_date,
            isCompleted: g.is_completed,
        }));
    },

    createGoal: async (goal: Omit<Goal, 'id' | 'userId' | 'currentValue' | 'isCompleted'>): Promise<Goal> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('goals')
            .insert({
                user_id: user.id,
                title: goal.title,
                type: goal.type,
                target_value: goal.targetValue,
                action_id: goal.actionId,
                start_date: goal.startDate,
                end_date: goal.endDate,
            })
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            userId: data.user_id,
            title: data.title,
            type: data.type,
            targetValue: data.target_value,
            currentValue: 0,
            actionId: data.action_id,
            startDate: data.start_date,
            endDate: data.end_date,
            isCompleted: false,
        };
    },

    deleteGoal: async (id: string): Promise<boolean> => {
        // Corrected delete syntax
        const { error } = await supabase.from('goals').delete().eq('id', id);
        return !error;
    },

    updateGoalsProgress: async (
        userId: string,
        actionId: string,
        duration: number,
        points: number
    ): Promise<void> => {
        // Fetch active goals
        const { data: goals } = await supabase
            .from('goals')
            .select('*')
            .eq('user_id', userId)
            .eq('is_completed', false);

        if (!goals) return;

        for (const goal of goals) {
            let increment = 0;

            // Check filters
            if (goal.action_id && goal.action_id !== actionId) continue;

            // Calculate increments
            if (goal.type === 'duration') increment = duration;
            else if (goal.type === 'points') increment = points;
            else if (goal.type === 'count') increment = 1;

            if (increment > 0) {
                const newValue = goal.current_value + increment;
                const isCompleted = newValue >= goal.target_value;

                await supabase
                    .from('goals')
                    .update({
                        current_value: newValue,
                        is_completed: isCompleted
                    })
                    .eq('id', goal.id);

                // Bonus XP for completing goal
                if (isCompleted) {
                    await SupabaseDataStore.updateUserProgress(userId, 200); // +200 XP Bonus
                }
            }
        }
    },

    // Leaderboard Stats
    getLeaderboardStats: async (weekStart: string, weekEnd: string): Promise<any[]> => {
        const { data, error } = await supabase
            .from('leaderboard_stats')
            .select('*')
            .eq('week_start', weekStart)
            .order('total_points', { ascending: false });

        if (error) {
            console.error('Error fetching leaderboard:', error);
            return [];
        }

        return (data || []).map(stat => ({
            id: stat.id,
            userId: stat.user_id,
            username: stat.username,
            totalPoints: stat.total_points,
            positiveActivities: stat.positive_activities,
            negativeActivities: stat.negative_activities,
            goalsCompleted: stat.goals_completed,
            weekStart: stat.week_start,
            weekEnd: stat.week_end,
        }));
    },

    updateUserWeeklyStats: async (userId: string, username: string, weekStart: string, weekEnd: string) => {
        // Get current week's stats
        const records = await SupabaseDataStore.getRecordsByDateRange(weekStart, weekEnd);
        const goals = await SupabaseDataStore.getGoals();

        const totalPoints = records.reduce((sum, r) => sum + r.pointsCalculated, 0);
        const positiveActivities = records.filter(r => r.pointsCalculated > 0).length;
        const negativeActivities = records.filter(r => r.pointsCalculated < 0).length;
        const goalsCompleted = goals.filter(g => g.isCompleted).length;

        // Upsert stats
        const { error } = await supabase
            .from('leaderboard_stats')
            .upsert({
                user_id: userId,
                username,
                week_start: weekStart,
                week_end: weekEnd,
                total_points: totalPoints,
                positive_activities: positiveActivities,
                negative_activities: negativeActivities,
                goals_completed: goalsCompleted,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id,week_start'
            });

        if (error) console.error('Error updating weekly stats:', error);
    },
};
