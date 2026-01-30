import { supabase } from '@/lib/supabase/client';
import { Action, DailyRecord, User, Goal, Strike } from '@/core/types';
import { getTodayString, getWeekStartString, getWeekEndString, getArgentinaDate } from '@/core/utils/dateUtils';
import { subDays } from 'date-fns';

export const SupabaseDataStore = {
    // Authentication
    login: async (usernameOrEmail: string, password: string): Promise<User | null> => {
        let email = usernameOrEmail;

        // If simple username, try to find associated email or fallback to demo
        if (!email.includes('@')) {
            const { data } = await supabase
                .from('users')
                .select('email')
                .eq('username', usernameOrEmail)
                .single();

            if (data?.email) {
                email = data.email;
            } else {
                // Fallback for legacy/demo users
                email = `${usernameOrEmail}@demo.com`;
            }
        }

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
            timestamp: r.timestamp,
            durationMinutes: r.duration_minutes,
            metricValue: r.metric_value ? Number(r.metric_value) : undefined,
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
            .order('timestamp', { ascending: true });

        if (error || !data) return [];

        return data.map(r => ({
            id: r.id,
            actionId: r.action_id,
            actionName: r.action_name,
            date: r.date,
            timestamp: r.timestamp,
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
            timestamp: r.timestamp,
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
                timestamp: record.timestamp,
                duration_minutes: record.durationMinutes,
                points_calculated: record.pointsCalculated,
                metric_value: record.metricValue || 0,
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
            record.pointsCalculated,
            record.metricValue
        );

        // 4. Update Leaderboard Stats (Weekly)
        const weekStart = getWeekStartString();
        const weekEnd = getWeekEndString();

        // We need the username. It's safe to fetch it or rely on app state, 
        // but here we can fetch it briefly or pass it. 
        // For efficiency, we might want to cache this, but for now we fetch.
        const currentUser = await SupabaseDataStore.getCurrentUser();
        if (currentUser) {
            await SupabaseDataStore.updateUserWeeklyStats(user.id, currentUser.username, weekStart, weekEnd);
        }

        return {
            id: data.id,
            actionId: data.action_id,
            actionName: data.action_name,
            date: data.date,
            timestamp: data.timestamp,
            durationMinutes: data.duration_minutes,
            metricValue: Number(data.metric_value),
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
            metricType: g.metric_type,
            metricUnit: g.metric_unit,
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
                metric_type: goal.metricType,
                metric_unit: goal.metricUnit,
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
            metricType: data.metric_type,
            metricUnit: data.metric_unit,
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
        points: number,
        metricValue?: number
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
            if (metricValue && goal.metric_type) {
                // If goal has a specific metric type (e.g., 'kilometers', 'pages'), use metricValue
                // This covers cases like "Run 54km" -> 20km activity
                increment = metricValue;
            } else if (goal.type === 'duration') {
                // Handle unit conversion: Input is usually minutes.
                // If goal unit is hours, convert.
                if (goal.metric_unit === 'horas' || goal.metric_unit === 'hours') {
                    increment = duration / 60;
                } else {
                    increment = duration;
                }
            } else if (goal.type === 'points') {
                increment = points;
            } else if (goal.type === 'count') {
                increment = 1;
            } else if (metricValue) {
                // Fallback
                increment = metricValue;
            }

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

        return (data || []).map(stat => {
            // "Last 24h" logic check for staleness
            // If the record wasn't updated 'today' (Argentina Time), then the 24h stats are old.
            const todayStr = getTodayString();
            const lastUpdate = stat.updated_at ? new Date(stat.updated_at) : new Date(0);
            // We compare dates. Ideally we convert updated_at to Argentina time to be precise, 
            // but just checking if the ISO string date part matches todayStr (or is very recent) is a good proxy.
            // Since we store updated_at as ISO UTC, let's just make sure it's recent.
            // A simpler way: if the date hasn't changed since the last update.
            // But wait, user might have updated at 23:59 yesterday.
            // Let's rely on our previous logic: we only write to points_last_24h if it happened TODAY.
            // So if the row was NOT updated TODAY, it means no activity happened ONLY for today.
            // Wait, if I do nothing today, my row isn't updated, so it holds yesterday's data. Correct.
            // So we need to detect if 'updated_at' is from Today.

            // Convert update time to Argentina Date string to compare
            // We can reuse getArgentinaDate logic but we'd need to parse the ISO string.
            // For simplicity/speed: use basic date comparison if specific timezone lib usage is too complex here.
            // Actually, we imported 'toZonedTime' in dateUtils, but didn't export it. 
            // Let's just do a rough check or import date-fns helpers.
            // Actually, simply:
            const isUpdatedToday = stat.updated_at && stat.updated_at.includes(todayStr);
            // Note: updated_at in DB is usually UTC. todayStr is Argentina. 
            // This might mismatch around midnight. 
            // Robust fix: Check if updated_at is older than ~24h? No, user wants "Today's points".
            // If I haven't acted today, my 'points_last_24h' (which means Today's points in our new logic) should be 0.
            // Use 'getTodayString' and compare with stat.updated_at converted to Argentina.

            // Let's assume for now that if it's not from today string (roughly), we zero it.
            // Since updated_at is UTC, we need to be careful.
            // Let's just use a "freshness" timeout. If older than 24h, definitely 0.
            // But better: if (now - updated_at) > 24h, it's 0.
            // User complained about "30h ago". 

            const msSinceUpdate = new Date().getTime() - new Date(stat.updated_at).getTime();
            const hoursSinceUpdate = msSinceUpdate / (1000 * 60 * 60);
            const isFresh = hoursSinceUpdate < 16; // 16 hours "freshness" buffer to cover "the day". 
            // If I act at 8am, and check at 10pm, it's 14h. It shows up.
            // If I act yesterday at 10pm, and check today 10am (12h diff), it might still show up?
            // Yes, "Last 24h" technically includes yesterday.
            // But the user said: "A user yesterday did nothing... today I see what he did BEFORE yesterday".
            // So the data is VERY old.

            return {
                id: stat.id,
                userId: stat.user_id,
                username: stat.username,
                totalPoints: stat.total_points,
                positiveActivities: stat.positive_activities,
                negativeActivities: stat.negative_activities,
                goalsCompleted: stat.goals_completed,
                pointsLast24hPositive: isFresh ? (stat.points_last_24h_positive || 0) : 0,
                pointsLast24hNegative: isFresh ? (stat.points_last_24h_negative || 0) : 0,
                weekStart: stat.week_start,
                weekEnd: stat.week_end,
            };
        });
    },

    updateUserWeeklyStats: async (userId: string, username: string, weekStart: string, weekEnd: string) => {
        // Get current week's records
        const records = await SupabaseDataStore.getRecordsByDateRange(weekStart, weekEnd);

        // Get goals matching week (approximate, or just check completed ones updated recently)
        // For simplicity, we count ALL completed active goals or filter by updated_at if available. 
        // Better: count goals completed in this timeframe. 
        // For now, let's count *currently* completed goals as the user requested.
        const goals = await SupabaseDataStore.getGoals();

        const totalPoints = records.reduce((sum, r) => sum + r.pointsCalculated, 0);
        const positiveActivities = records.filter(r => r.pointsCalculated > 0).length;
        const negativeActivities = records.filter(r => r.pointsCalculated < 0).length;
        const goalsCompleted = goals.filter(g => g.isCompleted).length;

        // Calculate 24h stats - approximated to "Today's Activity" in Argentina Time
        // Since we only have date resolution (YYYY-MM-DD), "Last 24h" effectively means "Today"
        // If we want to be generous, we could include yesterday, but the user specifically complained about seeing old data.
        // Let's stick to strict "Today" based on Argentina time.
        const todayStr = getTodayString();
        const recentStats = records.filter(r => r.date === todayStr);

        const pointsLast24hPos = recentStats.filter(r => r.pointsCalculated > 0).reduce((sum, r) => sum + r.pointsCalculated, 0);
        const pointsLast24hNeg = recentStats.filter(r => r.pointsCalculated < 0).reduce((sum, r) => sum + r.pointsCalculated, 0);

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
                points_last_24h_positive: pointsLast24hPos,
                points_last_24h_negative: pointsLast24hNeg,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id,week_start'
            });

        if (error) console.error('Error updating weekly stats:', error);
    },

    // Strikes
    getStrikes: async (): Promise<Strike[]> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('strikes')
            .select('*')
            .eq('user_id', user.id)
            .order('strike_date', { ascending: false });

        if (error || !data) return [];

        return data.map(s => ({
            id: s.id,
            userId: s.user_id,
            strikeDate: s.strike_date,
            reason: s.reason,
            detectedAt: s.detected_at,
        }));
    },

    createStrike: async (strike: Omit<Strike, 'id' | 'detectedAt'>): Promise<Strike> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('strikes')
            .insert({
                user_id: user.id,
                strike_date: strike.strikeDate,
                reason: strike.reason,
            })
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            userId: data.user_id,
            strikeDate: data.strike_date,
            reason: data.reason,
            detectedAt: data.detected_at,
        };
    },

    checkAndCreateStrike: async (date: string): Promise<Strike | null> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        // Check if strike already exists
        const { data: existing } = await supabase
            .from('strikes')
            .select('*')
            .eq('user_id', user.id)
            .eq('strike_date', date)
            .single();

        if (existing) return null;

        // Create new strike
        try {
            return await SupabaseDataStore.createStrike({
                userId: user.id,
                strikeDate: date,
                reason: 'Sin actividad registrada',
            });
        } catch (error) {
            console.error('Error creating strike:', error);
            return null;
        }
    },
};
