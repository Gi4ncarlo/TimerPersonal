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
                .ilike('username', usernameOrEmail) // Case insensitive lookup
                .maybeSingle(); // Use maybeSingle to avoid 406 if multiple matches (should be unique) or none

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
            email: profile.email,
            role: profile.role || 'user',
            preferences: profile.preferences || {},
            level: profile.level || 1,
            xp: profile.xp || 0,
            avatarUrl: profile.avatar_url,
        };
    },

    updatePassword: async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) return { success: false, error: error.message };
        return { success: true };
    },

    updateProfilePicture: async (userId: string, avatarUrl: string): Promise<{ success: boolean; error?: string }> => {
        const { error } = await supabase
            .from('users')
            .update({ avatar_url: avatarUrl })
            .eq('id', userId);

        if (error) return { success: false, error: error.message };
        return { success: true };
    },

    updateUsername: async (userId: string, newUsername: string): Promise<{ success: boolean; error?: string }> => {
        // Check if username is already taken
        const { data: existing } = await supabase
            .from('users')
            .select('id')
            .ilike('username', newUsername)
            .neq('id', userId)
            .maybeSingle();

        if (existing) {
            return { success: false, error: 'Este nombre de usuario ya está en uso' };
        }

        const { error } = await supabase
            .from('users')
            .update({ username: newUsername })
            .eq('id', userId);

        if (error) return { success: false, error: error.message };
        return { success: true };
    },

    uploadAvatar: async (userId: string, file: File): Promise<{ url?: string; error?: string }> => {
        try {
            // Validate file type
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                return { error: 'Formato no válido. Solo se aceptan JPG, PNG o WEBP' };
            }

            // Validate file size (max 5MB)
            const maxSize = 5 * 1024 * 1024;
            if (file.size > maxSize) {
                return { error: 'El archivo es muy grande. Máximo 5MB' };
            }

            // Generate unique filename
            const fileExt = file.name.split('.').pop();
            const fileName = `${userId}-${Date.now()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            // Delete old avatar if exists
            const { data: userData } = await supabase
                .from('users')
                .select('avatar_url')
                .eq('id', userId)
                .single();

            if (userData?.avatar_url) {
                const oldPath = userData.avatar_url.split('/').pop();
                if (oldPath) {
                    await supabase.storage.from('avatars').remove([`avatars/${oldPath}`]);
                }
            }

            // Upload new avatar
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (uploadError) {
                return { error: uploadError.message };
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            return { url: publicUrl };
        } catch (error) {
            return { error: 'Error al subir la imagen' };
        }
    },


    updateUserProgress: async (userId: string, xpToAdd: number): Promise<void> => {
        // 1. Get current data
        const { data: user } = await supabase
            .from('users')
            .select('xp, level')
            .eq('id', userId)
            .single();

        if (!user) return;

        const oldLevel = user.level || 1;
        const newXp = (user.xp || 0) + xpToAdd;
        // Simple logic: Level = 1 + floor(XP / 1000), capped at MAX_LEVEL (50)
        const newLevel = Math.min(50, 1 + Math.floor(newXp / 1000));

        // 2. Update user level and XP
        await supabase
            .from('users')
            .update({ xp: newXp, level: newLevel })
            .eq('id', userId);

        // 3. Check for level up and award bonus points
        if (newLevel > oldLevel) {
            const { getLevelReward } = await import('@/core/config/levelRewards');

            // Award bonus for each level gained
            for (let level = oldLevel + 1; level <= newLevel; level++) {
                const reward = getLevelReward(level);
                if (reward && reward.bonusPoints > 0) {
                    // Create a bonus record for the level up
                    const { getTodayString } = await import('@/core/utils/dateUtils');
                    await supabase.from('daily_records').insert({
                        user_id: userId,
                        action_name: `🎉 Bonus Nivel ${level}`,
                        date: getTodayString(),
                        timestamp: new Date().toISOString(),
                        duration_minutes: 0,
                        points_calculated: reward.bonusPoints,
                        notes: `Recompensa por alcanzar ${reward.title} - Nivel ${level}`,
                    });
                }
            }
        }
    },

    // Actions
    getActions: async (): Promise<Action[]> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        // Fetch personal and global actions separately to avoid .or() issues with NULL
        const [personalRes, globalRes] = await Promise.all([
            supabase.from('actions').select('*').eq('user_id', user.id),
            supabase.from('actions').select('*').is('user_id', null)
        ]);

        const data = [...(personalRes.data || []), ...(globalRes.data || [])];
        const error = personalRes.error || globalRes.error;

        // Deduplicate by name, preferring Global (null user_id)
        const uniqueActions: Record<string, any> = {};
        data.forEach(action => {
            if (uniqueActions[action.name] && uniqueActions[action.name].user_id === null) {
                return;
            }
            uniqueActions[action.name] = action;
        });

        return Object.values(uniqueActions).map(a => ({
            id: a.id,
            userId: a.user_id,
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
                user_id: action.pointsPerMinute !== undefined ? null : user.id, // Logic to decide if global or not (Admin will use separate method)
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

    updateAction: async (id: string, updates: Partial<Action>): Promise<void> => {
        const { error } = await supabase
            .from('actions')
            .update({
                name: updates.name,
                points_per_minute: updates.pointsPerMinute,
                type: updates.type,
                metadata: updates.metadata
            })
            .eq('id', id);

        if (error) throw error;
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
            .order('date', { ascending: false })
            .order('timestamp', { ascending: false });

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
        // 1. Fetch record before deletion to know what to revert
        const { data: record, error: fetchError } = await supabase
            .from('daily_records')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !record) return false;

        // 2. Revert XP if it was positive (createRecord adds XP based on durationMinutes)
        if (Number(record.points_calculated) > 0) {
            await SupabaseDataStore.updateUserProgress(record.user_id, -Number(record.duration_minutes));
        }

        // 3. Revert Goals Progress
        await SupabaseDataStore.revertGoalsProgress(
            record.user_id,
            record.action_id,
            Number(record.duration_minutes),
            Number(record.points_calculated),
            Number(record.metric_value)
        );

        // 4. Delete the record
        const { error: deleteError } = await supabase.from('daily_records').delete().eq('id', id);
        if (deleteError) return false;

        // 5. Update Weekly Stats
        const weekStart = getWeekStartString();
        const weekEnd = getWeekEndString();
        const currentUser = await SupabaseDataStore.getCurrentUser();
        if (currentUser) {
            await SupabaseDataStore.updateUserWeeklyStats(record.user_id, currentUser.username, weekStart, weekEnd);
        }

        return true;
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
        // 1. Fetch goal to check if it was completed
        const { data: goal, error: fetchError } = await supabase
            .from('goals')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !goal) return false;

        // 2. If it was completed, revert bonus XP (200 XP completion bonus)
        if (goal.is_completed) {
            await SupabaseDataStore.updateUserProgress(goal.user_id, -200);
        }

        // 3. Delete
        const { error: deleteError } = await supabase.from('goals').delete().eq('id', id);
        if (deleteError) return false;

        // 4. Update stats to reflect loss of completed goal in leaderboard
        const weekStart = getWeekStartString();
        const weekEnd = getWeekEndString();
        const currentUser = await SupabaseDataStore.getCurrentUser();
        if (currentUser) {
            await SupabaseDataStore.updateUserWeeklyStats(goal.user_id, currentUser.username, weekStart, weekEnd);
        }

        return true;
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

    revertGoalsProgress: async (
        userId: string,
        actionId: string,
        duration: number,
        points: number,
        metricValue?: number
    ): Promise<void> => {
        // Fetch all goals for this user (we need to check if any previously completed goal becomes active again)
        const { data: goals, error } = await supabase
            .from('goals')
            .select('*')
            .eq('user_id', userId);

        if (error || !goals) return;

        for (const goal of goals) {
            let decrement = 0;

            // Check filters (matching goal logic in updateGoalsProgress)
            if (goal.action_id && goal.action_id !== actionId) continue;

            // Calculate decrements
            if (metricValue && goal.metric_type) {
                decrement = metricValue;
            } else if (goal.type === 'duration') {
                if (goal.metric_unit === 'horas' || goal.metric_unit === 'hours') {
                    decrement = duration / 60;
                } else {
                    decrement = duration;
                }
            } else if (goal.type === 'points') {
                decrement = points;
            } else if (goal.type === 'count') {
                decrement = 1;
            } else if (metricValue) {
                decrement = metricValue;
            }

            if (decrement > 0) {
                const oldValue = Number(goal.current_value);
                const newValue = Math.max(0, oldValue - decrement);
                const wasCompleted = goal.is_completed;
                const isStillCompleted = newValue >= Number(goal.target_value);

                // Update goal state
                await supabase
                    .from('goals')
                    .update({
                        current_value: newValue,
                        is_completed: isStillCompleted
                    })
                    .eq('id', goal.id);

                // Revert bonus XP if it was completed but no longer is
                if (wasCompleted && !isStillCompleted) {
                    await SupabaseDataStore.updateUserProgress(userId, -200); // Revert +200 XP Bonus
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

        const result = (data || []).map(stat => {
            // "Last 24h" logic check for staleness
            // If the record wasn't updated 'today' (Argentina Time), then the 24h stats are old.
            const todayStr = getTodayString();
            const lastUpdate = stat.updated_at ? new Date(stat.updated_at) : new Date(0);

            // Check freshness
            const msSinceUpdate = new Date().getTime() - new Date(stat.updated_at).getTime();
            const hoursSinceUpdate = msSinceUpdate / (1000 * 60 * 60);
            const isFresh = hoursSinceUpdate < 16;

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
                strikes: stat.strikes || 0,
                weekStart: stat.week_start,
                weekEnd: stat.week_end,
            };
        });

        // Fallback: If strikes are consistently 0 (column might trigger error or be missing if select * didn't catch it properly or migration failed),
        // we might want to fetch them manually. 
        // However, since we couldn't migrate, the select * might not have 'strikes'.
        // Let's do a manual fetch of strikes for this week for the users in the leaderboard to be safe.
        // Actually, let's fetch ALL strikes for the users to show "Total Strikes" or "Weekly Strikes"?
        // Request said: "una columna ... muestren la cantidad de strykes que tiene el usuario". 
        // usually implies TOTAL strikes.

        const userIds = data?.map(d => d.user_id) || [];
        if (userIds.length > 0) {
            const { data: userData } = await supabase
                .from('users')
                .select('id, avatar_url')
                .in('id', userIds);

            const { data: strikesData } = await supabase
                .from('strikes')
                .select('user_id')
                .in('user_id', userIds);

            const userMap = (userData || []).reduce((acc, curr) => {
                acc[curr.id] = curr.avatar_url;
                return acc;
            }, {} as Record<string, string>);

            const strikeCounts = (strikesData || []).reduce((acc, curr) => {
                acc[curr.user_id] = (acc[curr.user_id] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            return result.map(r => ({
                ...r,
                avatarUrl: userMap[r.userId],
                strikes: strikeCounts[r.userId] || 0
            }));
        }

        return result;
    },

    getAllTimeLeaderboard: async (): Promise<any[]> => {
        try {
            // Fetch ALL users first
            const { data: allUsers, error: usersError } = await supabase
                .from('users')
                .select('id, username, avatar_url');

            console.log('getAllTimeLeaderboard - Total users:', allUsers?.length);

            if (usersError) {
                console.error('Error fetching users:', usersError);
                return [];
            }

            if (!allUsers || allUsers.length === 0) {
                console.warn('No users found in database');
                return [];
            }

            // Fetch all daily records
            const { data: records } = await supabase
                .from('daily_records')
                .select('user_id, points_calculated');

            const pointsAggregator: Record<string, number> = {};
            const positiveCountAggregator: Record<string, number> = {};
            const negativeCountAggregator: Record<string, number> = {};

            if (records) {
                records.forEach(r => {
                    const points = Number(r.points_calculated);
                    pointsAggregator[r.user_id] = (pointsAggregator[r.user_id] || 0) + points;

                    if (points >= 0) {
                        positiveCountAggregator[r.user_id] = (positiveCountAggregator[r.user_id] || 0) + 1;
                    } else {
                        negativeCountAggregator[r.user_id] = (negativeCountAggregator[r.user_id] || 0) + 1;
                    }
                });
            }

            // Fetch completed goals
            const { data: completedGoals } = await supabase
                .from('goals')
                .select('user_id')
                .eq('is_completed', true);

            const goalsAggregator: Record<string, number> = {};
            if (completedGoals) {
                completedGoals.forEach(g => {
                    goalsAggregator[g.user_id] = (goalsAggregator[g.user_id] || 0) + 1;
                });
            }

            // Fetch strikes for all users
            const { data: strikesData } = await supabase.from('strikes').select('user_id');
            const strikeCounts = (strikesData || []).reduce((acc, curr) => {
                acc[curr.user_id] = (acc[curr.user_id] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            // Create leaderboard entry for EVERY user
            const leaderboard = allUsers.map(user => ({
                id: user.id,
                userId: user.id,
                username: user.username || 'Usuario',
                avatarUrl: user.avatar_url,
                totalPoints: pointsAggregator[user.id] || 0,
                positiveActivities: positiveCountAggregator[user.id] || 0,
                negativeActivities: negativeCountAggregator[user.id] || 0,
                goalsCompleted: goalsAggregator[user.id] || 0,
                strikes: strikeCounts[user.id] || 0,
                weekStart: 'All Time',
                weekEnd: 'All Time'
            }));

            console.log('getAllTimeLeaderboard - Leaderboard entries:', leaderboard.length);

            // Sort by total points descending
            return leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);
        } catch (error) {
            console.error('getAllTimeLeaderboard error:', error);
            return [];
        }
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
            // Apply Penalty FIRST
            await SupabaseDataStore.applyStrikePenalty(user.id, date);

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

    applyStrikePenalty: async (userId: string, strikeDate: string): Promise<void> => {
        // 1. Calculate Total Points up to strikeDate (inclusive or exclusive? usually up to that moment)
        // Since granularity is Day, we typically sum everything BEFORE this penalty record.
        // But to be precise "Total de puntos ganados que tenes actualmente".
        // Use all records.
        const { data: records, error } = await supabase
            .from('daily_records')
            .select('points_calculated')
            .eq('user_id', userId);

        if (error || !records) return;

        const currentTotal = records.reduce((sum, r) => sum + Number(r.points_calculated), 0);

        // If total is <= 0 using logic "points gained", maybe we don't penalize? 
        // User said: "reste ... del total de puntos ganados". 
        // If I have 100 points, penalty is 40. New total 60.
        // If I have -50 points? Penalty logic might differ. 
        // Assuming we only penalize POSITIVE totals or simply mathematically 40% of net.
        // "40% del total de puntos ganados que tenes actualmente".
        // Let's assume Net Total.
        if (currentTotal <= 0) return;

        const penalty = Math.floor(currentTotal * 0.40);

        if (penalty > 0) {
            console.log(`Applying strike penalty of ${penalty} points (Total: ${currentTotal})`);

            // Create penalty record
            await supabase.from('daily_records').insert({
                user_id: userId,
                action_name: 'Penalizacion por Stryke',
                // No action_id needed or use a system one
                date: getTodayString(), // The penalty happens NOW/TODAY when detected.
                timestamp: new Date().toISOString(),
                duration_minutes: 0,
                points_calculated: -penalty,
                notes: `Strike detectado el ${strikeDate}. Penalización del 40% sobre ${currentTotal} puntos.`
            });

            // We should also update leaderboard cache if needed, but the triggers/createRecord wrapper might handle it.
            // But here we inserted directly to avoid 'createRecord' overhead or circular deps. 
            // Let's manually trigger cache update
            const weekStart = getWeekStartString();
            const weekEnd = getWeekEndString();

            // Fetch username
            const { data: user } = await supabase.from('users').select('username').eq('id', userId).single();
            if (user) {
                await SupabaseDataStore.updateUserWeeklyStats(userId, user.username, weekStart, weekEnd);
            }
        }
    },

    scanAndApplyRetroactiveStrikes: async (): Promise<string> => {
        // 1. Get all users? Or just current user if client-side? 
        // Admin usually implies all users. 
        // But Supabase client availability depends on RLS. 
        // Assuming I'm logged in as someone who can see strikes or checking for MYSELF.
        // "Revisa si algun usuario tiene strykes". 
        // I will try to fetch ALL strikes if RLS allows, or iterate users if possible.
        // For simplicity/safety in this app context, let's assume we scan for the current user 
        // OR better, we try to fetch all strikes (admin mode).

        const { data: strikes, error } = await supabase.from('strikes').select('*');

        if (error || !strikes) return 'Error fetching strikes';

        let appliedCount = 0;

        for (const strike of strikes) {
            // Check if penalty exists for this strike date (approx)
            // We search for a record with action_name 'Penalizacion por Stryke' created around that date?
            // Or just checks if ANY penalty exists for this user?
            // A user might have multiple strikes. We need 1 penalty per strike.
            // But we didn't link penalty to strike ID.
            // Let's search for "Penalizacion por Stryke" records for this user.

            const { data: penalties } = await supabase
                .from('daily_records')
                .select('*')
                .eq('user_id', strike.user_id)
                .eq('action_name', 'Penalizacion por Stryke')
                .ilike('notes', `%${strike.strike_date}%`); // Ensure we match the specific strike via notes

            if (!penalties || penalties.length === 0) {
                // Apply penalty!
                await SupabaseDataStore.applyStrikePenalty(strike.user_id, strike.strike_date);
                appliedCount++;
            }
        }

        return `Proceso completado. Se aplicaron ${appliedCount} penalizaciones retroactivas.`;
    },
};
