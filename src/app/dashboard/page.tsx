'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import QuestCard from '@/ui/components/QuestCard';
import ActionItem from '@/ui/components/ActionItem';
import ActivityModal from '@/ui/components/ActivityModal';
import StaticTimeDisplay from '@/ui/components/StaticTimeDisplay';
import UserLevel from '@/ui/components/UserLevel';
import Twemoji from '@/ui/components/Twemoji';
import GoalTracker from '@/ui/components/GoalTracker';
import StrikeWarning from '@/ui/components/StrikeWarning';
import ProfileModal from '@/ui/components/ProfileModal';
import CreateActionModal from '@/ui/components/CreateActionModal';
import CreateShortcutModal from '@/ui/components/CreateShortcutModal';
import DailyMissionsCard from '@/ui/components/DailyMissionsCard';
import GachaRoulette from '@/ui/components/GachaRoulette';
import ActiveBuffsDisplay from '@/ui/components/ActiveBuffsDisplay';
import ConfirmModal from '@/ui/components/ConfirmModal';
import Navbar from '@/ui/components/Navbar';
import LogoLoader from '@/ui/components/LogoLoader';
import LevelUpModal from '@/ui/components/LevelUpModal';
import WeeklySummaryModal from '@/ui/components/WeeklySummaryModal';
import DopamineAgeSurvey from '@/ui/DopamineAgeSurvey/DopamineAgeSurvey';
import DopamineAgeCard from '@/ui/DopamineAgeCard/DopamineAgeCard';
import { useAppStore } from '@/store';
import { SupabaseDataStore } from '@/data/supabaseData';
import { BalanceCalculator } from '@/core/services/BalanceCalculator';
import { PointsCalculator } from '@/core/services/PointsCalculator';
import { StrikeDetector } from '@/core/services/StrikeDetector';
import { VacationService } from '@/core/services/VacationService';
import { DailyMissionEngine } from '@/core/services/DailyMissionEngine';
import { NotificationEngine } from '@/core/services/NotificationEngine';
import { WeeklySummaryEngine } from '@/core/services/WeeklySummaryEngine';
import { Action, DailyRecord, DailyMission, Goal, Strike, User, VacationPeriod, SmartNotification, SarcasmLevel, ActiveBuff, NotificationType, League, LEAGUE_THRESHOLDS, WeeklySummary } from '@/core/types';
import { format, differenceInCalendarDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { getTodayString, getArgentinaDate, getWeekStartString } from '@/core/utils/dateUtils';
import './dashboard.css';

// Global debounce for notification checks (prevents Strict Mode double-fire)
let lastNotificationCheck = 0;

export default function Dashboard() {
    const router = useRouter();
    const [actions, setActions] = useState<Action[]>([]);
    const [records, setRecords] = useState<DailyRecord[]>([]);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [userLevel, setUserLevel] = useState({ level: 1, xp: 0 });
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    const [selectedAction, setSelectedAction] = useState<Action | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    // Guards to prevent double-execution in React Strict Mode
    const retroactiveProcessedRef = useRef(false);
    const missionsGeneratedRef = useRef(false);
    const [isCreateActionModalOpen, setIsCreateActionModalOpen] = useState(false);
    const [accumulatedPoints, setAccumulatedPoints] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingActionId, setLoadingActionId] = useState<string | null>(null);

    // Strike State
    const [latestStrikes, setLatestStrikes] = useState<Strike[]>([]);
    const [showStrikeWarning, setShowStrikeWarning] = useState(false);
    const [isArmoryOpen, setIsArmoryOpen] = useState(false);
    const [isOnVacation, setIsOnVacation] = useState(false);

    // League / Level Up State
    const currentLeagueRef = useRef<League | null>(null);
    const prevLevelRef = useRef<number | null>(null);
    const [showLevelUpModal, setShowLevelUpModal] = useState(false);
    const [achievedLevel, setAchievedLevel] = useState<number>(0);
    const [achievedLeague, setAchievedLeague] = useState<League | null>(null);

    // Daily Missions State
    const [dailyMissions, setDailyMissions] = useState<DailyMission[]>([]);
    const [missionsLoading, setMissionsLoading] = useState(false);
    const [missionStreak, setMissionStreak] = useState(0);
    const [dailyRerollsUsed, setDailyRerollsUsed] = useState(0);
    const [rerollingMissionId, setRerollingMissionId] = useState<string | null>(null);

    // Smart Notifications State
    const [notifications, setNotifications] = useState<SmartNotification[]>([]);

    // Gacha Roulette State
    const [isGachaOpen, setIsGachaOpen] = useState(false);
    const [activeBuffs, setActiveBuffs] = useState<ActiveBuff[]>([]);
    const [hasFreeSpin, setHasFreeSpin] = useState(false);

    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [recordToDelete, setRecordToDelete] = useState<string | null>(null);

    // Weekly Summary State
    const [showWeeklySummary, setShowWeeklySummary] = useState(false);
    const [isWeeklySummaryLoading, setIsWeeklySummaryLoading] = useState(false);
    const [weeklySummaryData, setWeeklySummaryData] = useState<WeeklySummary | null>(null);
    const [previousWeeklySummary, setPreviousWeeklySummary] = useState<WeeklySummary | null>(null);
    const weeklySummaryCheckedRef = useRef(false);

    // Ref for History Auto-Scroll
    const historyListRef = useRef<HTMLDivElement>(null);

    // Dopamine Age Integration
    const { dopamineAge, isLoadingDopamineAge, fetchDopamineAge } = useAppStore();

    useEffect(() => {
        loadData();
        fetchDopamineAge(); // Llamamos al backend lazy-loading para cargar la Dopamine Age
    }, []);

    // Auto-scroll history to bottom when records update
    useEffect(() => {
        if (historyListRef.current) {
            historyListRef.current.scrollTop = historyListRef.current.scrollHeight;
        }
    }, [records]);

    const loadData = async () => {
        try {
            const user = await SupabaseDataStore.getCurrentUser();
            if (!user) {
                router.push('/login');
                return;
            }
            setCurrentUser(user);
            setUserLevel({ level: user.level, xp: user.xp });

            const [fetchedActions, fetchedRecords, fetchedGoals, fetchedVacations, fetchedBuffs] = await Promise.all([
                SupabaseDataStore.getActions(),
                SupabaseDataStore.getRecords(),
                SupabaseDataStore.getGoals(),
                SupabaseDataStore.getVacationPeriods(),
                SupabaseDataStore.getActiveBuffs(),
            ]);

            setActions(fetchedActions);
            setRecords(fetchedRecords);
            setGoals(fetchedGoals);
            setActiveBuffs(fetchedBuffs);

            // Calculate total points (already in points, no conversion needed)
            const totalPoints = fetchedRecords.reduce((sum, r) => sum + r.pointsCalculated, 0);
            setAccumulatedPoints(totalPoints);

            // Check free spin availability
            try {
                const { data: gachaData } = await supabase
                    .from('gacha_state')
                    .select('free_spin_available, free_spin_used_at')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (!gachaData) {
                    setHasFreeSpin(true); // New user, first spin is free
                } else {
                    const FREE_SPIN_COOLDOWN_DAYS = 7;
                    let free = gachaData.free_spin_available;
                    if (!free && gachaData.free_spin_used_at) {
                        const usedDate = new Date(gachaData.free_spin_used_at);
                        const diffDays = (Date.now() - usedDate.getTime()) / (1000 * 60 * 60 * 24);
                        free = diffDays >= FREE_SPIN_COOLDOWN_DAYS;
                    } else if (!gachaData.free_spin_used_at) {
                        free = true;
                    }
                    setHasFreeSpin(free);
                }
            } catch {
                // Non-critical, default to false
            }

            // Level Up / League Up logic
            const newLeague = LEAGUE_THRESHOLDS.reduce((prev, curr) => totalPoints >= curr.minPoints ? curr : prev);

            // Revisa si es la primera carga o no
            if (prevLevelRef.current !== null) {
                // Comprueba si ha subido de nivel numérico o de Liga
                if (user.level > prevLevelRef.current) {
                    setAchievedLevel(user.level);
                    setShowLevelUpModal(true);
                } else if (currentLeagueRef.current && newLeague.tier !== currentLeagueRef.current.tier && newLeague.minPoints > currentLeagueRef.current.minPoints) {
                    // Mantenemos el aviso de subida de liga por si acaso, aunque el nivel numérico es el protagonista ahora
                    setAchievedLeague(newLeague);
                    // Puedes decidir si la liga dispara un modal diferente en el futuro, por ahora reusaremos LevelUpModal si el nivel subió.
                }
            }

            prevLevelRef.current = user.level;
            currentLeagueRef.current = newLeague;

            // Check vacation status
            const today = getTodayString();
            const activeVacation = VacationService.getActiveVacation(fetchedVacations, today);
            setIsOnVacation(!!activeVacation);

            // Trigger vacation notifications if needed
            if (user.email) {
                for (const period of fetchedVacations) {
                    if (VacationService.needsStartNotification(period, today)) {
                        try {
                            await fetch('/api/vacation-notify', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    type: 'start',
                                    userEmail: user.email,
                                    userName: user.username || 'Usuario',
                                    startDate: period.startDate,
                                    endDate: period.endDate,
                                    reason: period.reason,
                                }),
                            });
                            await SupabaseDataStore.markVacationNotified(period.id, 'start');
                        } catch (e) { console.warn('Vacation start notification failed:', e); }
                    }
                    if (VacationService.needsEndWarning(period, today)) {
                        try {
                            await fetch('/api/vacation-notify', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    type: 'end_warning',
                                    userEmail: user.email,
                                    userName: user.username || 'Usuario',
                                    startDate: period.startDate,
                                    endDate: period.endDate,
                                    reason: period.reason,
                                }),
                            });
                            await SupabaseDataStore.markVacationNotified(period.id, 'end_warning');
                        } catch (e) { console.warn('Vacation end warning notification failed:', e); }
                    }
                }
            }

            // Check for missed days (multi-day strikes) - vacation-aware
            const missedDays = StrikeDetector.detectMissedDays(fetchedRecords, fetchedVacations);
            if (missedDays.length > 0) {
                const newStrikes = await SupabaseDataStore.processMissedStrikes(missedDays);
                if (newStrikes.length > 0) {
                    setLatestStrikes(newStrikes);
                    setShowStrikeWarning(true);
                }
            }

            // ── Weekly Summary Auto-Trigger (Mondays) ──
            if (!weeklySummaryCheckedRef.current) {
                weeklySummaryCheckedRef.current = true;
                try {
                    const argDate = getArgentinaDate();
                    const isMonday = argDate.getDay() === 1;
                    const todayKey = `weekly_summary_shown_${today}`;
                    const alreadyShown = typeof window !== 'undefined' && localStorage.getItem(todayKey) === 'true';

                    if (isMonday && !alreadyShown) {
                        // Compute last week's summary
                        const lastWeekMonday = WeeklySummaryEngine.getPreviousWeekMonday(getWeekStartString());
                        const lastWeekSunday = WeeklySummaryEngine.getSundayFromMonday(lastWeekMonday);

                        // Check if already saved
                        let savedSummary = await SupabaseDataStore.getWeeklySummary(user.id, lastWeekMonday);

                        if (!savedSummary) {
                            // Compute from raw data
                            const lastWeekRecords = await SupabaseDataStore.getRecordsByDateRange(lastWeekMonday, lastWeekSunday);
                            const lastWeekStrikes = await SupabaseDataStore.getStrikesForDateRange(user.id, lastWeekMonday, lastWeekSunday);

                            // Find leaderboard position
                            let position: number | null = null;
                            try {
                                const lb = await SupabaseDataStore.getLeaderboardStats(lastWeekMonday, lastWeekSunday);
                                const idx = lb.findIndex((e: any) => e.userId === user.id);
                                if (idx >= 0) position = idx + 1;
                            } catch { /* leaderboard may not exist for that week */ }

                            const computed = WeeklySummaryEngine.computeWeeklySummary(
                                user.id, lastWeekRecords, lastWeekStrikes, lastWeekMonday, lastWeekSunday, position
                            );

                            await SupabaseDataStore.saveWeeklySummary(computed);
                            savedSummary = { ...computed, id: '', createdAt: new Date().toISOString() };
                        }

                        // Get the week before for comparison
                        const twoWeeksAgoMonday = WeeklySummaryEngine.getPreviousWeekMonday(lastWeekMonday);
                        const prevSummary = await SupabaseDataStore.getWeeklySummary(user.id, twoWeeksAgoMonday);

                        setWeeklySummaryData(savedSummary);
                        setPreviousWeeklySummary(prevSummary);
                        setShowWeeklySummary(true);

                        // Mark as shown for today
                        if (typeof window !== 'undefined') {
                            localStorage.setItem(todayKey, 'true');
                        }
                    }
                } catch (wsErr) {
                    console.warn('Weekly summary auto-trigger error:', wsErr);
                }
            }

            // ── Daily Missions ──────────────────────────────────
            try {
                setMissionsLoading(true);

                // ── 0. Init Local State for this run ──
                const localAddedRecords: string[] = [];
                let recordsSnapshot = fetchedRecords;

                // Define limitMissions in a wider scope so it can be used later
                let limitMissions: any[] = [];

                // ── 1. Process YESTERDAY'S Limit Missions (Retroactive Completion) ──
                // Guard: Only run retroactive check once per mount (prevents strict mode double-fire)
                if (!retroactiveProcessedRef.current) {
                    retroactiveProcessedRef.current = true;

                    // If a "limit" mission ended yesterday and is still "in_progress", it means they succeeded.
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayStr = getArgentinaDate(yesterday).toISOString().split('T')[0];

                    const yesterdayMissions = await SupabaseDataStore.getDailyMissions(yesterdayStr);
                    limitMissions = yesterdayMissions.filter(m => m.missionType === 'limit_negative' && m.status === 'in_progress');

                    if (limitMissions.length > 0) {
                        const yesterdayRecs = await SupabaseDataStore.getRecordsByDate(yesterdayStr);

                        for (const m of limitMissions) {
                            const { currentValue, status } = DailyMissionEngine.checkMissionProgress(m, yesterdayRecs);
                            // For limit types, engine returns 'failed' if over, 'in_progress' if under.
                            if (status !== 'failed') {
                                const successTitle = `✨ Control Logrado (Ayer)`;

                                // ─── CRITICAL CHECK: prevent double award ───
                                // Check if we already logged this SPECIFIC result today
                                const alreadyLogged = recordsSnapshot.some(r =>
                                    r.date === today &&
                                    r.actionName === successTitle &&
                                    r.notes?.includes(m.title)
                                );

                                if (alreadyLogged) {
                                    continue;
                                }

                                // SUCCESS! They survived the day.
                                await SupabaseDataStore.updateMissionProgress(m.id, currentValue, 'completed');
                                await SupabaseDataStore.updateUserProgress(user.id, Math.floor(m.rewardPoints * 1.2)); // 20% bonus for discipline

                                // Log it for TODAY so they see the points
                                await SupabaseDataStore.logSystemEvent({
                                    userId: user.id,
                                    actionName: successTitle,
                                    date: today,
                                    timestamp: new Date().toISOString(),
                                    points: m.rewardPoints,
                                    notes: `Misión de límite completada exitosamente: ${m.title}`
                                });

                                // NEW: Persist Notification
                                const notifMsg = NotificationEngine.getSmartMessage('achievement', {
                                    mission: m.title,
                                    points: m.rewardPoints
                                }, (user.preferences?.sarcasmLevel as SarcasmLevel) || 'medium');

                                await SupabaseDataStore.createNotification({
                                    userId: user.id,
                                    type: 'achievement',
                                    title: notifMsg.title,
                                    message: notifMsg.message,
                                    context: { missionId: m.id, points: m.rewardPoints }
                                });

                                toast.success(`¡Misión de ayer completada!`, { description: `${m.title}: +${m.rewardPoints} sendas` });
                                localAddedRecords.push(successTitle);
                            }
                        }
                    }
                }

                // ── 2. Process TODAY'S Missions ──
                let missions = await SupabaseDataStore.getDailyMissions(today);

                if (missions.length === 0 && fetchedActions.length > 0 && !missionsGeneratedRef.current) {
                    // First login of the day → generate new missions
                    missionsGeneratedRef.current = true;
                    const streak = await SupabaseDataStore.getMissionStreak(user.id);
                    setMissionStreak(streak); // Save for UI
                    const generated = DailyMissionEngine.generateDailyMissions(
                        fetchedActions, today, user.id, streak
                    );
                    missions = await SupabaseDataStore.createDailyMissions(generated);
                }

                // Recalculate progress based on today's records
                const todayRecs = recordsSnapshot.filter(r => r.date === today);
                const updates = DailyMissionEngine.checkAllMissions(missions, todayRecs);
                let anyChanges = false;

                for (const u of updates) {
                    if (u.changed) {
                        await SupabaseDataStore.updateMissionProgress(u.mission.id, u.newValue, u.newStatus);
                        // Award bonus points + XP when a mission is newly completed
                        if (u.newStatus === 'completed' && u.mission.status !== 'completed') {
                            const missionTitle = `✨ Misión: ${u.mission.title}`;

                            // ─── CRITICAL CHECK: prevent double award on re-mount ───
                            const alreadyLogged = recordsSnapshot.some(r =>
                                r.date === today &&
                                r.actionName === missionTitle
                            );
                            if (alreadyLogged) {
                                continue;
                            }

                            await SupabaseDataStore.updateUserProgress(user.id, Math.floor(u.mission.rewardPoints / 10));

                            // Log history record
                            await SupabaseDataStore.logSystemEvent({
                                userId: user.id,
                                actionName: missionTitle,
                                date: today,
                                timestamp: new Date().toISOString(),
                                points: u.mission.rewardPoints,
                                notes: `Completada: ${u.mission.description}`
                            });

                            // Persist Notification
                            const notifMsg = NotificationEngine.getSmartMessage('achievement', {
                                mission: u.mission.title,
                                points: u.mission.rewardPoints
                            }, (user.preferences?.sarcasmLevel as SarcasmLevel) || 'medium');

                            await SupabaseDataStore.createNotification({
                                userId: user.id,
                                type: 'achievement',
                                title: notifMsg.title,
                                message: notifMsg.message,
                                context: { missionId: u.mission.id, points: u.mission.rewardPoints }
                            });

                            toast.success(`¡Misión completada!`, { description: `${u.mission.title}: +${u.mission.rewardPoints} sendas` });

                            localAddedRecords.push(missionTitle);
                            anyChanges = true;
                        } else if (u.mission.status === 'completed' && u.newStatus !== 'completed') {
                            // Mission was completed, but now it's not (e.g. record deleted)
                            // 1. Revert XP bonus (10% of points)
                            await SupabaseDataStore.updateUserProgress(user.id, -Math.floor(u.mission.rewardPoints / 10));

                            // 2. Find and delete the "Mission Completed" history record
                            const missionTitle = `✨ Misión: ${u.mission.title}`;
                            const historyRecord = recordsSnapshot.find(r =>
                                r.date === today &&
                                r.actionName === missionTitle
                            );

                            if (historyRecord) {
                                await SupabaseDataStore.deleteRecord(historyRecord.id);
                                toast.info(`Progreso de misión revertido`, { description: `${u.mission.title}` });
                            }
                            anyChanges = true;
                        }
                    }
                }

                // Re-fetch after updates for accurate state
                if (anyChanges || limitMissions.length > 0) {
                    missions = await SupabaseDataStore.getDailyMissions(today);

                    const refreshedUser = await SupabaseDataStore.getCurrentUser();
                    if (refreshedUser) {
                        setUserLevel({ level: refreshedUser.level, xp: refreshedUser.xp });
                    }
                    // Refresh records to show new system events
                    const newRecs = await SupabaseDataStore.getRecordsByDate(today);
                    recordsSnapshot = [...fetchedRecords.filter(r => r.date !== today), ...newRecs];
                    setRecords(recordsSnapshot);
                }

                // Refresh notifications so the bell icon shows achievement notifications
                const allNotifs = await SupabaseDataStore.getAllNotifications();
                setNotifications(allNotifs);

                setDailyMissions(missions);

                // ALWAYS load streak unconditionally — no conditions, no stale closures
                const currentStreak = await SupabaseDataStore.getMissionStreak(user.id);
                setMissionStreak(currentStreak);

                const currentRerolls = await SupabaseDataStore.getDailyRerolls(user.id, today);
                setDailyRerollsUsed(currentRerolls);

            } catch (missionErr) {
                console.warn('Daily missions error:', missionErr);
            } finally {
                setMissionsLoading(false);
            }

            // ── Smart Notifications ────────────────────────────
            try {
                await loadNotifications(user, fetchedRecords);
            } catch (notifErr) {
                console.warn('Smart notifications error:', notifErr);
            }

        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadNotifications = async (user: User, allRecords: DailyRecord[]) => {
        // Prevent double-checking (Strict Mode / rapid re-mounts)
        const currentTimestamp = Date.now();
        if (currentTimestamp - lastNotificationCheck < 60000) return; // 1 minute cooldown
        lastNotificationCheck = currentTimestamp;

        // 1. Get sarcasm level from preferences
        const sarcasmLevel: SarcasmLevel = (user.preferences?.sarcasmLevel as SarcasmLevel) || 'medium';

        // 2. Calculate trigger inputs from existing data
        const today = getTodayString();
        const todayRecs = allRecords.filter(r => r.date === today);

        // Days since last activity
        const sortedDates = [...new Set(allRecords.map(r => r.date))].sort().reverse();
        const lastActiveDate = sortedDates.find(d => d !== today) || today;
        const daysSinceLastActivity = differenceInCalendarDays(new Date(today), new Date(lastActiveDate));

        // Basic streak: consecutive days with records
        let currentStreak = 0;
        const dateSet = new Set(allRecords.map(r => r.date));
        const checkDate = new Date(today);
        for (let i = 0; i < 365; i++) {
            const ds = format(checkDate, 'yyyy-MM-dd');
            if (dateSet.has(ds)) {
                currentStreak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }

        // Weekly points
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        const weekStart = format(startOfWeek, 'yyyy-MM-dd');

        const lastWeekStart = new Date(startOfWeek);
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);
        const lastWeekStartStr = format(lastWeekStart, 'yyyy-MM-dd');

        const thisWeekPoints = allRecords
            .filter(r => r.date >= weekStart)
            .reduce((s, r) => s + r.pointsCalculated, 0);

        const lastWeekPoints = allRecords
            .filter(r => r.date >= lastWeekStartStr && r.date < weekStart)
            .reduce((s, r) => s + r.pointsCalculated, 0);

        const totalWeeks = Math.max(1, Math.ceil(allRecords.length / 7));
        const weeklyAvgPoints = allRecords.reduce((s, r) => s + r.pointsCalculated, 0) / totalWeeks;

        // 3. Run the core notification engine
        const triggers = NotificationEngine.analyzeAndTrigger({
            username: user.username,
            todayRecordsCount: todayRecs.length,
            daysSinceLastActivity,
            currentStreak,
            thisWeekPoints,
            lastWeekPoints,
            weeklyAvgPoints,
            sarcasmLevel,
        });

        // 3b. Run ADVANCED triggers (stats, competitive, personal records)
        try {
            // Today's points total
            const todayPoints = todayRecs.reduce((s, r) => s + r.pointsCalculated, 0);

            // Previous best day
            const datePointsMap: Record<string, number> = {};
            allRecords.forEach(r => {
                datePointsMap[r.date] = (datePointsMap[r.date] || 0) + r.pointsCalculated;
            });
            const previousDayTotals = Object.entries(datePointsMap)
                .filter(([d]) => d !== today)
                .map(([, pts]) => pts);
            const previousBestDayPoints = previousDayTotals.length > 0
                ? Math.max(...previousDayTotals) : 0;

            // Goals
            const allGoals = await SupabaseDataStore.getGoals();
            const goalData = allGoals.map(g => ({
                title: g.title,
                currentValue: g.currentValue,
                targetValue: g.targetValue,
                isCompleted: g.isCompleted,
            }));

            // Competitive — closest rival above via all-time leaderboard
            let closestRivalAbove: { username: string; gap: number } | null = null;
            try {
                const leaderboard = await SupabaseDataStore.getAllTimeLeaderboard();
                const myIdx = leaderboard.findIndex((e: any) => e.userId === user.id);
                if (myIdx > 0) {
                    const above = leaderboard[myIdx - 1];
                    const myPoints = leaderboard[myIdx].totalPoints || 0;
                    closestRivalAbove = {
                        username: above.username,
                        gap: (above.totalPoints || 0) - myPoints,
                    };
                }
            } catch { /* leaderboard unavailable */ }

            // Consistency — active days this week
            const thisWeekDates = new Set(
                allRecords.filter(r => r.date >= weekStart).map(r => r.date)
            );
            const activeDaysThisWeek = thisWeekDates.size;

            // Hourly peak — most active hour from all records
            const hourCounts: Record<number, number> = {};
            allRecords.forEach(r => {
                if (r.timestamp) {
                    try {
                        const h = new Date(r.timestamp).getHours();
                        hourCounts[h] = (hourCounts[h] || 0) + 1;
                    } catch { /* skip */ }
                }
            });
            let peakHour: number | undefined;
            let peakCount = 0;
            for (const [h, c] of Object.entries(hourCounts)) {
                if (c > peakCount) {
                    peakCount = c;
                    peakHour = Number(h);
                }
            }
            const currentHour = new Date().getHours();

            // Best day of week
            const DAY_NAMES_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
            const dayOfWeekPoints: number[] = [0, 0, 0, 0, 0, 0, 0];
            const dayOfWeekCounts: number[] = [0, 0, 0, 0, 0, 0, 0];
            Object.entries(datePointsMap).forEach(([d, pts]) => {
                try {
                    const dow = new Date(d + 'T12:00:00').getDay();
                    dayOfWeekPoints[dow] += pts;
                    dayOfWeekCounts[dow]++;
                } catch { /* skip */ }
            });
            const avgByDay = dayOfWeekPoints.map((p, i) =>
                dayOfWeekCounts[i] > 0 ? p / dayOfWeekCounts[i] : 0
            );
            const bestDowIdx = avgByDay.indexOf(Math.max(...avgByDay));
            const bestDayOfWeek = Math.max(...avgByDay) > 0 ? DAY_NAMES_ES[bestDowIdx] : undefined;
            const todayDayName = DAY_NAMES_ES[new Date().getDay()];

            const advancedTriggers = NotificationEngine.analyzeAdvancedTriggers({
                username: user.username,
                sarcasmLevel,
                todayRecordsCount: todayRecs.length,
                todayPoints,
                previousBestDayPoints,
                goals: goalData,
                closestRivalAbove,
                activeDaysThisWeek,
                peakHour,
                currentHour,
                bestDayOfWeek,
                todayDayName,
            });

            triggers.push(...advancedTriggers);
        } catch (advErr) {
            console.warn('Advanced triggers error:', advErr);
        }

        // 4. Anti-spam: filter out recently sent notifications
        const recentTypes = await SupabaseDataStore.getRecentNotificationTypes();
        const newTriggers = NotificationEngine.deduplicateTriggers(triggers, recentTypes, {
            perTypeCooldownHours: 12,
            globalCooldownHours: 4,
            maxPerDay: 4
        });

        // 5. Persist new notifications and show toasts
        for (const trigger of newTriggers) {
            const saved = await SupabaseDataStore.createNotification({
                userId: user.id,
                type: trigger.type,
                title: trigger.title,
                message: trigger.message,
                context: trigger.context,
            });

            if (saved) {
                toast(trigger.title, {
                    description: trigger.message,
                    duration: 6000,
                });
            }
        }

        // 6. Load all notifications for the bell icon
        const allNotifs = await SupabaseDataStore.getAllNotifications();
        setNotifications(allNotifs);
    };

    const refreshNotifications = async () => {
        const allNotifs = await SupabaseDataStore.getAllNotifications();
        setNotifications(allNotifs);
    };

    const handleActionClick = (action: Action) => {
        setSelectedAction(action);
        setIsModalOpen(true);
    };

    const handleQuickAdd = async (actionId: string, minutes: number, note: string, metricValue?: number) => {
        const action = actions.find(a => a.id === actionId);
        if (!action) return;

        setLoadingActionId(actionId);
        try {
            await handleModalSubmit({ durationMinutes: minutes, metricValue, notes: note }, action);
        } finally {
            setLoadingActionId(null);
        }
    };

    const handleModalSubmit = async (data: { durationMinutes: number; metricValue?: number; notes: string; targetGoalId?: string }, overrideAction?: Action) => {
        const actionToUse = overrideAction || selectedAction;
        if (!actionToUse) return;

        try {
            // PointsCalculator.createRecord now defaults to getTodayString() for date
            // and generates timestamp automatically in Argentina timezone
            // v2: Pass activeBuffs to apply multipliers
            const newRecord = PointsCalculator.createRecord(
                actionToUse,
                data.durationMinutes,
                activeBuffs, // Pass current buffs
                undefined, // Let it default to getTodayString()
                data.notes,
                data.metricValue,
                data.targetGoalId // Passes the selective milestone ID if present
            );

            await SupabaseDataStore.createRecord(newRecord);
            await loadData(); // Reload everything (XP, Goals, etc.)

            // Auto-close both modal and armory
            setIsModalOpen(false);
            setIsArmoryOpen(false);
        } catch (error) {
            console.error('Error creating record:', error);
            alert('Error al guardar la actividad');
        }
    };

    const handleCreateGoal = async (title: string, targetValue: number, actionId?: string, metricType?: string, metricUnit?: string, period?: string) => {
        try {
            await SupabaseDataStore.createGoal({
                title,
                type: metricType === 'points' ? 'points' : metricType === 'hours' ? 'duration' : 'count',
                targetValue,
                actionId,
                metricType: metricType as any,
                metricUnit,
                period: (period as any) || 'weekly',
                isMilestone: period === 'milestone',
                startDate: new Date().toISOString().split('T')[0],
            });
            await loadData();
        } catch (error) {
            console.error('Error creating goal:', error);
        }
    };

    const handleDeleteGoal = async (id: string) => {
        if (confirm('¿Eliminar objetivo?')) {
            await SupabaseDataStore.deleteGoal(id);
            await loadData();
        }
    };

    // ... (delete record, logout handlers same as before)
    // ... (delete record, logout handlers same as before)
    const handleDeleteRecordRequest = (recordId: string) => {
        setRecordToDelete(recordId);
        setIsConfirmOpen(true);
    };

    const confirmDeleteRecord = async () => {
        if (recordToDelete) {
            await SupabaseDataStore.deleteRecord(recordToDelete);
            await loadData();
            setRecordToDelete(null);
        }
    };

    const handleLogout = async () => {
        await SupabaseDataStore.logout();
        router.push('/login');
    };

    const handleCreateAction = async (name: string, type: 'positive' | 'negative', points: number, metadata?: any, targetGoalId?: string) => {
        try {
            const newAction = await SupabaseDataStore.createAction({
                name,
                type,
                pointsPerMinute: points,
                metadata: metadata || { inputType: 'impact' }
            });

            if (targetGoalId) {
                // Link the new action to the target goal
                await SupabaseDataStore.linkActionToGoal(targetGoalId, newAction.id);
            }

            await loadData();
            setIsCreateActionModalOpen(false);
            toast.success('¡Actividad creada exitosamente!');
        } catch (error) {
            console.error('Error creating action:', error);
            alert('Error al crear la actividad');
        }
    };

    const handleDeleteAction = async (id: string) => {
        if (confirm('¿Eliminar esta actividad?')) {
            await SupabaseDataStore.deleteAction(id);
            await loadData();
        }
    };

    const handleGoalClick = (goal: Goal) => {
        if (goal.actionId) {
            const action = actions.find(a => a.id === goal.actionId);
            if (action) {
                // Pre-configure the modal for this specific goal
                setSelectedAction({
                    ...action,
                    metadata: {
                        ...action.metadata,
                        targetGoalId: goal.id
                    }
                });
                setIsModalOpen(true);
            }
        } else if (goal.isMilestone) {
            // Milestone without specific action
            setSelectedAction({
                id: 'milestone-special',
                name: goal.title,
                type: 'positive',
                pointsPerMinute: 0,
                metadata: { inputType: 'milestone' }
            } as any);
            setIsModalOpen(true);
        } else {
            // Goal without actionId (e.g. Monthly mission created without linked action)
            if (confirm(`Esta misión ("${goal.title}") no tiene una actividad vinculada. ¿Deseas crear una ahora?`)) {
                setIsCreateActionModalOpen(true);
            }
        }
    };

    // Custom Shortcuts State
    const [shortcuts, setShortcuts] = useState<{ id: string, label: string, actionId: string, duration: number, note: string }[]>([]);
    const [isShortcutModalOpen, setIsShortcutModalOpen] = useState(false);

    // Load shortcuts from localStorage on mount
    useEffect(() => {
        if (currentUser) {
            const savedShortcuts = localStorage.getItem(`antigravity_shortcuts_${currentUser.id}`);
            if (savedShortcuts) {
                setShortcuts(JSON.parse(savedShortcuts));
            }
        }
    }, [currentUser]);

    const handleSaveShortcut = (label: string, actionId: string, duration: number, note: string) => {
        if (!currentUser) return;
        const newShortcut = {
            id: Date.now().toString(),
            label,
            actionId,
            duration,
            note
        };
        const updatedShortcuts = [...shortcuts, newShortcut];
        setShortcuts(updatedShortcuts);
        localStorage.setItem(`antigravity_shortcuts_${currentUser.id}`, JSON.stringify(updatedShortcuts));
    };

    const handleDeleteShortcut = (id: string) => {
        if (!currentUser) return;
        if (confirm('¿Eliminar este atajo?')) {
            const updatedShortcuts = shortcuts.filter(s => s.id !== id);
            setShortcuts(updatedShortcuts);
            localStorage.setItem(`antigravity_shortcuts_${currentUser.id}`, JSON.stringify(updatedShortcuts));
        }
    };

    const handleExecuteShortcut = async (shortcut: { actionId: string, duration: number, note: string, label: string }) => {
        const action = actions.find(a => a.id === shortcut.actionId);
        if (!action) return;

        setLoadingActionId(shortcut.label); // Use label as ID for loader
        try {
            await handleModalSubmit({ durationMinutes: shortcut.duration, metricValue: undefined, notes: shortcut.note }, action);
        } finally {
            setLoadingActionId(null);
        }
    };

    const handleRerollMission = async (missionId: string) => {
        if (!currentUser) return;
        if (dailyRerollsUsed >= 2) {
            toast.error('Límite alcanzado', { description: 'Ya usaste tus 2 cambios de hoy.' });
            return;
        }

        setRerollingMissionId(missionId);
        try {
            const today = getTodayString();
            const newMissionData = DailyMissionEngine.generateSingleReplacementMission(
                dailyMissions,
                actions,
                today,
                currentUser.id,
                missionStreak
            );

            const success = await SupabaseDataStore.rerollDailyMission(missionId, newMissionData, currentUser.id, today);

            if (success) {
                // Refresh missions and reroll count
                const [refreshedMissions, refreshedRerolls] = await Promise.all([
                    SupabaseDataStore.getDailyMissions(today),
                    SupabaseDataStore.getDailyRerolls(currentUser.id, today)
                ]);
                setDailyMissions(refreshedMissions);
                setDailyRerollsUsed(refreshedRerolls);
                toast.success('Misión reemplazada', { description: 'Te ha tocado un nuevo desafío.' });
            } else {
                toast.error('Error', { description: 'No se pudo reemplazar la misión.' });
            }
        } catch (error) {
            console.error('Error rerolling:', error);
            toast.error('Error', { description: 'Ocurrió un problema de conexión.' });
        } finally {
            setRerollingMissionId(null);
        }
    };

    // Quick Add Presets (Dynamic)
    const getQuickAdds = () => {
        return (
            <div className="quick-add-bar">
                {shortcuts.map(shortcut => (
                    <button
                        key={shortcut.id}
                        className="quick-add-btn"
                        onClick={() => handleExecuteShortcut(shortcut)}
                        onContextMenu={(e) => { e.preventDefault(); handleDeleteShortcut(shortcut.id); }}
                        disabled={loadingActionId === shortcut.label}
                        title={`${shortcut.note} (${shortcut.duration}m) - Click derecho para eliminar`}
                    >
                        {loadingActionId === shortcut.label ? (
                            <span className="btn-loader"></span>
                        ) : (
                            <>
                                <Twemoji emoji="⚡" /> {shortcut.label}
                            </>
                        )}
                    </button>
                ))}

                <button
                    className="quick-add-btn add-new"
                    onClick={() => setIsShortcutModalOpen(true)}
                    title="Crear nuevo atajo"
                >
                    <Twemoji emoji="➕" />
                </button>
            </div>
        );
    };

    // ── Manual Weekly Summary Open ──
    const handleOpenWeeklySummary = async () => {
        if (!currentUser || isWeeklySummaryLoading) return;
        setIsWeeklySummaryLoading(true);
        try {
            // Try to load the most recent saved summary
            let summary = await SupabaseDataStore.getLastWeeklySummary(currentUser.id);

            if (!summary) {
                // Compute current week's partial summary on-the-fly
                const weekStart = getWeekStartString();
                const weekEnd = WeeklySummaryEngine.getSundayFromMonday(weekStart);
                const weekRecords = await SupabaseDataStore.getRecordsByDateRange(weekStart, getTodayString());
                const weekStrikes = await SupabaseDataStore.getStrikesForDateRange(currentUser.id, weekStart, getTodayString());

                let position: number | null = null;
                try {
                    const lb = await SupabaseDataStore.getLeaderboardStats(weekStart, weekEnd);
                    const idx = lb.findIndex((e: any) => e.userId === currentUser.id);
                    if (idx >= 0) position = idx + 1;
                } catch { /* leaderboard may not exist */ }

                const computed = WeeklySummaryEngine.computeWeeklySummary(
                    currentUser.id, weekRecords, weekStrikes, weekStart, weekEnd, position
                );
                summary = { ...computed, id: 'live', createdAt: new Date().toISOString() };
            }

            // Get previous for comparison
            const prevMonday = WeeklySummaryEngine.getPreviousWeekMonday(summary.weekStart);
            const prev = await SupabaseDataStore.getWeeklySummary(currentUser.id, prevMonday);

            setWeeklySummaryData(summary);
            setPreviousWeeklySummary(prev);
            setShowWeeklySummary(true);
        } catch (err) {
            console.error('Error opening weekly summary:', err);
            toast.error('No se pudo cargar el resumen semanal');
        } finally {
            setIsWeeklySummaryLoading(false);
        }
    };

    if (isLoading) return <LogoLoader />;

    const todayRecords = records.filter(r => r.date === getTodayString());
    const todayBalance = BalanceCalculator.getDailyBalance(todayRecords, getArgentinaDate());

    // Calculate active global multiplier for display
    const activeGlobalMultiplier = activeBuffs
        .filter(b => b.buffType === 'global' && new Date(b.expiresAt) > new Date())
        .reduce((acc, b) => acc + (b.multiplier - 1), 1);

    const hasActivityMultipliers = activeBuffs
        .some(b => b.buffType === 'activity' && new Date(b.expiresAt) > new Date());

    return (
        <main className="dashboard">
            <div className="dashboard-container-new">
                <Navbar
                    currentUser={currentUser}
                    userLevel={userLevel}
                    isOnVacation={isOnVacation}
                    onProfileClick={() => setIsProfileModalOpen(true)}
                    showArmoryToggle={true}
                    isArmoryOpen={isArmoryOpen}
                    onArmoryToggle={setIsArmoryOpen}
                    notifications={notifications}
                    onNotifRefresh={refreshNotifications}
                />
                {getQuickAdds()}

                <DailyMissionsCard
                    missions={dailyMissions}
                    loading={missionsLoading}
                    streakDays={missionStreak}
                    rerollsUsed={dailyRerollsUsed}
                    onReroll={handleRerollMission}
                    rerollingId={rerollingMissionId}
                />

                <div className="command-hub-layout">
                    {/* ROW 1: THE HEROES (POINTS & HISTORY) */}
                    <div className="hero-row">
                        <section className="the-forge materialized">
                            <div className={`accumulated-time-card ${accumulatedPoints >= 0 ? 'positive' : 'negative'} ethereal-border`}>
                                <p className="accumulated-label text-arcade">
                                    {accumulatedPoints >= 0 ? '✓ PUNTOS GANADOS' : '⚠ PUNTOS EN DEUDA'}
                                    {activeGlobalMultiplier > 1 && (
                                        <span className="global-mult-badge">
                                            <span style={{ color: '#fff', WebkitTextFillColor: '#fff' }}>x{activeGlobalMultiplier.toFixed(1)}</span>
                                            {' '}
                                            <span style={{ color: 'initial', WebkitTextFillColor: 'initial', textShadow: 'none', filter: 'none' }}>⚡</span>
                                        </span>
                                    )}
                                </p>
                                <StaticTimeDisplay totalPoints={accumulatedPoints} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '12px' }}>
                                    <button className={`gacha-cta-banner ${hasFreeSpin ? 'has-free-spin' : ''}`} onClick={() => setIsGachaOpen(true)}>
                                        <span className="gacha-cta-icon">🎰</span>
                                        <span className="gacha-cta-text">Ruleta de Premios</span>
                                        {hasFreeSpin && (
                                            <span className="gacha-cta-free-badge">
                                                🎁 ¡TIRADA GRATIS!
                                            </span>
                                        )}
                                        <span className="gacha-cta-shine"></span>
                                    </button>
                                    <button className="weekly-summary-cta" onClick={handleOpenWeeklySummary} disabled={isWeeklySummaryLoading}>
                                        {isWeeklySummaryLoading ? (
                                            <span className="btn-loader"></span>
                                        ) : (
                                            <>
                                                <span className="ws-cta-icon">📊</span>
                                                <span className="ws-cta-label">Resumen Semanal</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                                <ActiveBuffsDisplay buffs={activeBuffs} />

                                {(activeGlobalMultiplier > 1 || hasActivityMultipliers) && (
                                    <div className="mult-promo-message">
                                        🔥 ¡Multiplicadores activos! ¿Vas a desaprovechar esta oportunidad?
                                    </div>
                                )}

                                <div className="hero-decoration"></div>
                            </div>
                        </section>

                        {/* DOPAMINE AGE SECTION */}
                        {!isLoadingDopamineAge && dopamineAge && dopamineAge.surveyCompleted && (
                            <section className="dopamine-section">
                                <DopamineAgeCard />
                            </section>
                        )}

                        <section className="the-chronicle">
                            <QuestCard title="Historial" subtitle={`${todayRecords.length} hoy`}>
                                {todayRecords.length === 0 ? (
                                    <p className="no-records">El pergamino está en blanco...</p>
                                ) : (
                                    <div className="records-list-hub" ref={historyListRef}>
                                        {todayRecords.map(record => {
                                            let timeStr = '';
                                            if (record.timestamp) {
                                                const recordDate = new Date(record.timestamp);
                                                timeStr = recordDate.toLocaleTimeString('es-AR', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    hour12: false
                                                });
                                            }
                                            const relatedAction = actions.find(a => a.id === record.actionId);
                                            const unit = relatedAction?.metadata?.unit || 'min';
                                            const displayQuantity = record.metricValue || record.durationMinutes;

                                            // Format duration for better vibe if it's minutes
                                            const formatDuration = (val: number, u: string) => {
                                                if (u === 'min' && val >= 60) {
                                                    const h = Math.floor(val / 60);
                                                    const m = val % 60;
                                                    return `${h}h${m > 0 ? ` ${m}m` : ''}`;
                                                }
                                                return `${val} ${u}`;
                                            };

                                            return (
                                                <div key={record.id} className="record-item-hub glass-chronicle">
                                                    <div className="record-header">
                                                        <span className="record-name">{record.actionName.replace(/ðŸŽ‰/g, '✨')}</span>
                                                        <div className="record-actions-hub">
                                                            <p className={`record-impact ${record.pointsCalculated >= 0 ? 'positive' : 'negative'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                <img src="/images/senda-coin-large-sinbg.png" alt="Senda" className="senda-floating-icon senda-floating-icon--sm" />
                                                                {Math.abs(Math.floor(record.pointsCalculated))}{record.pointsCalculated >= 0 ? '+' : '-'}
                                                            </p>
                                                            <button
                                                                className="record-delete-hub"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteRecordRequest(record.id);
                                                                }}
                                                                title="Eliminar registro"
                                                            >
                                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="record-meta-hub">
                                                        <span className="record-time-stamp">{timeStr}</span>
                                                        <span className="record-duration">
                                                            {formatDuration(displayQuantity, unit)}
                                                        </span>
                                                    </div>
                                                    {record.notes && (
                                                        <div className="record-notes-hub">
                                                            {record.notes.replace(/ðŸŽ‰/g, '✨')}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                <div className="today-summary-hub">
                                    <p className="summary-line">
                                        <strong className={todayBalance.totalPoints >= 0 ? 'positive' : 'negative'}>
                                            {todayBalance.totalPoints >= 0 ? '+' : ''}
                                            {Math.floor(todayBalance.totalPoints)} sendas acumuladas hoy
                                        </strong>
                                    </p>
                                </div>
                            </QuestCard>
                        </section>
                    </div>

                    {/* ROW 2: THE MISSION (GOALS FULL WIDTH) */}
                    <div className="mission-row">
                        <GoalTracker
                            goals={goals}
                            actions={actions}
                            onCreateGoal={handleCreateGoal}
                            onDeleteGoal={handleDeleteGoal}
                            onCreateAction={() => setIsCreateActionModalOpen(true)}
                        />
                    </div>

                    {/* CONSOLE BACKDROP (Click outside to close) */}
                    <div
                        className={`console-backdrop ${isArmoryOpen ? 'visible' : ''}`}
                        onClick={() => setIsArmoryOpen(false)}
                    />

                    {/* DYNAMIC SIDEBAR: THE ARMORY (COMMAND CONSOLE) */}
                    <aside className={`command-console ${isArmoryOpen ? 'open' : ''}`}>
                        <div className="console-header">
                            <h2 className="console-title text-arcade">Arsenal de Mando</h2>
                            <div className="header-btns">
                                <button
                                    className="add-activity-console-btn"
                                    onClick={() => setIsCreateActionModalOpen(true)}
                                    title="Nueva Actividad"
                                >
                                    +
                                </button>
                                <button className="close-console" onClick={() => setIsArmoryOpen(false)}>×</button>
                            </div>
                        </div>

                        <div className="console-body">
                            <h3 className="section-label-alt text-arcade">Disciplinas</h3>
                            <div className="actions-list-console">
                                {actions.filter(a => a.type === 'positive').map(action => (
                                    <ActionItem
                                        key={action.id}
                                        action={action}
                                        progress=""
                                        onAdd={() => handleActionClick(action)}
                                        onDelete={handleDeleteAction}
                                    />
                                ))}
                            </div>

                            <div className="console-divider" />
                            <h3 className="section-label-alt text-arcade">Misiones y Hitos</h3>
                            <div className="actions-list-console">
                                {goals.filter(g => !g.isCompleted && (g.period === 'monthly' || g.period === 'annual' || g.period === 'milestone')).map(goal => (
                                    <div
                                        key={goal.id}
                                        className={`mission-item-console ${goal.period}`}
                                        onClick={() => handleGoalClick(goal)}
                                    >
                                        <div className="mission-info">
                                            <span className="mission-name">
                                                <Twemoji emoji={goal.isMilestone ? "🏆" : "🎯"} /> {goal.title}
                                            </span>
                                            <span className="mission-progress">{Math.floor((goal.currentValue / goal.targetValue) * 100)}%</span>
                                        </div>
                                        <div className="mission-bar">
                                            <div className="mission-bar-fill" style={{ width: `${Math.min(100, (goal.currentValue / goal.targetValue) * 100)}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="console-divider" />
                            <h3 className="section-label-alt text-arcade">Debilidades</h3>
                            <div className="actions-list-console">
                                {actions.filter(a => a.type === 'negative').map(action => (
                                    <ActionItem
                                        key={action.id}
                                        action={action}
                                        progress=""
                                        onAdd={() => handleActionClick(action)}
                                        onDelete={handleDeleteAction}
                                    />
                                ))}
                            </div>
                        </div>
                    </aside>
                </div>
            </div>

            {selectedAction && (
                <ActivityModal
                    action={selectedAction}
                    goals={goals}
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSubmit={(data) => handleModalSubmit(data)}
                />
            )}

            {showStrikeWarning && latestStrikes.length > 0 && (
                <StrikeWarning
                    strikeDates={latestStrikes.map(s => s.strikeDate)}
                    onDismiss={() => setShowStrikeWarning(false)}
                />
            )}

            {currentUser && (
                <ProfileModal
                    user={currentUser}
                    isOpen={isProfileModalOpen}
                    isOnVacation={isOnVacation}
                    onClose={() => setIsProfileModalOpen(false)}
                    onUpdate={() => loadData()}
                />
            )}

            <CreateActionModal
                isOpen={isCreateActionModalOpen}
                onClose={() => setIsCreateActionModalOpen(false)}
                onSubmit={handleCreateAction}
                goals={goals}
            />

            <CreateShortcutModal
                isOpen={isShortcutModalOpen}
                onClose={() => setIsShortcutModalOpen(false)}
                onSave={handleSaveShortcut}
                actions={actions}
            />

            <GachaRoulette
                isOpen={isGachaOpen}
                onClose={() => setIsGachaOpen(false)}
                currentBalance={accumulatedPoints}
                onSpinComplete={() => loadData()}
            />

            {showLevelUpModal && (
                <LevelUpModal
                    level={achievedLevel}
                    onClose={() => setShowLevelUpModal(false)}
                />
            )}

            {showWeeklySummary && weeklySummaryData && (
                <WeeklySummaryModal
                    summary={weeklySummaryData}
                    previousSummary={previousWeeklySummary}
                    onClose={() => setShowWeeklySummary(false)}
                />
            )}

            {/* SURVEY OVERLAY */}
            {!isLoadingDopamineAge && (dopamineAge === null || !dopamineAge.surveyCompleted) && (
                <DopamineAgeSurvey />
            )}

            <ConfirmModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={confirmDeleteRecord}
                title="¿Eliminar actividad?"
                message="Esta acción restará las sendas obtenidas y no se puede deshacer."
                confirmText="Sí, eliminar"
                cancelText="Cancelar"
                isDestructive={true}
            />
        </main>
    );
}
