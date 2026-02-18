'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
import Navbar from '@/ui/components/Navbar';
import { SupabaseDataStore } from '@/data/supabaseData';
import { BalanceCalculator } from '@/core/services/BalanceCalculator';
import { PointsCalculator } from '@/core/services/PointsCalculator';
import { StrikeDetector } from '@/core/services/StrikeDetector';
import { VacationService } from '@/core/services/VacationService';
import { DailyMissionEngine } from '@/core/services/DailyMissionEngine';
import { Action, DailyRecord, DailyMission, Goal, Strike, User, VacationPeriod } from '@/core/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getTodayString, getArgentinaDate } from '@/core/utils/dateUtils';
import './dashboard.css';

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
    const [isCreateActionModalOpen, setIsCreateActionModalOpen] = useState(false);
    const [accumulatedPoints, setAccumulatedPoints] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingActionId, setLoadingActionId] = useState<string | null>(null);

    // Strike State
    const [latestStrikes, setLatestStrikes] = useState<Strike[]>([]);
    const [showStrikeWarning, setShowStrikeWarning] = useState(false);
    const [isArmoryOpen, setIsArmoryOpen] = useState(false);
    const [isOnVacation, setIsOnVacation] = useState(false);

    // Daily Missions State
    const [dailyMissions, setDailyMissions] = useState<DailyMission[]>([]);
    const [missionsLoading, setMissionsLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const user = await SupabaseDataStore.getCurrentUser();
            if (!user) {
                router.push('/login');
                return;
            }
            setCurrentUser(user);
            setUserLevel({ level: user.level, xp: user.xp });

            const [fetchedActions, fetchedRecords, fetchedGoals, fetchedVacations] = await Promise.all([
                SupabaseDataStore.getActions(),
                SupabaseDataStore.getRecords(),
                SupabaseDataStore.getGoals(),
                SupabaseDataStore.getVacationPeriods(),
            ]);

            setActions(fetchedActions);
            setRecords(fetchedRecords);
            setGoals(fetchedGoals);

            // Calculate total points (already in points, no conversion needed)
            const totalPoints = fetchedRecords.reduce((sum, r) => sum + r.pointsCalculated, 0);
            setAccumulatedPoints(totalPoints);

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

            // ── Daily Missions ──────────────────────────────────
            try {
                setMissionsLoading(true);
                let missions = await SupabaseDataStore.getDailyMissions(today);

                if (missions.length === 0 && fetchedActions.length > 0) {
                    // First login of the day → generate new missions
                    const streak = await SupabaseDataStore.getMissionStreak(user.id);
                    const generated = DailyMissionEngine.generateDailyMissions(
                        fetchedActions, today, user.id, streak
                    );
                    missions = await SupabaseDataStore.createDailyMissions(generated);
                }

                // Recalculate progress based on today's records
                const todayRecs = fetchedRecords.filter(r => r.date === today);
                const updates = DailyMissionEngine.checkAllMissions(missions, todayRecs);
                for (const u of updates) {
                    if (u.changed) {
                        await SupabaseDataStore.updateMissionProgress(u.mission.id, u.newValue, u.newStatus);
                        // Award bonus points + XP when a mission is newly completed
                        if (u.newStatus === 'completed' && u.mission.status !== 'completed') {
                            await SupabaseDataStore.updateUserProgress(user.id, Math.floor(u.mission.rewardPoints / 10));

                            // Log history record
                            await SupabaseDataStore.logSystemEvent({
                                userId: user.id,
                                actionName: `✨ Misión: ${u.mission.title}`,
                                date: today,
                                timestamp: new Date().toISOString(),
                                points: u.mission.rewardPoints,
                                notes: `Completada: ${u.mission.description}`
                            });
                        }
                    }
                }

                // Re-fetch after updates for accurate state
                if (updates.some(u => u.changed)) {
                    missions = await SupabaseDataStore.getDailyMissions(today);
                    // Refresh user level in case XP changed
                    const refreshedUser = await SupabaseDataStore.getCurrentUser();
                    if (refreshedUser) {
                        setUserLevel({ level: refreshedUser.level, xp: refreshedUser.xp });
                    }
                }

                // 2024-05-22 Fix: Ensure all completed missions have a history record
                // (Backfill if missed due to refresh/timing)
                for (const m of missions) {
                    if (m.status === 'completed') {
                        // Check if we have a record for this mission today
                        const hasRecord = fetchedRecords.some(r =>
                            r.date === today &&
                            // Check title match (handling potential prefix variations)
                            (r.actionName === `✨ Misión: ${m.title}` || r.notes?.includes(m.title))
                        );

                        if (!hasRecord) {
                            console.log('Backfilling missing history for mission:', m.title);
                            await SupabaseDataStore.logSystemEvent({
                                userId: user.id,
                                actionName: `✨ Misión: ${m.title}`,
                                date: today,
                                timestamp: new Date().toISOString(),
                                points: m.rewardPoints,
                                notes: `Completada: ${m.description} (Recuperada)`
                            });
                            // Force refresh records to show it immediately
                            const newRecs = await SupabaseDataStore.getRecordsByDate(today);
                            setRecords(newRecs);
                        }
                    }
                }

                setDailyMissions(missions);
            } catch (missionErr) {
                console.warn('Daily missions error:', missionErr);
            } finally {
                setMissionsLoading(false);
            }

        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsLoading(false);
        }
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
            const newRecord = PointsCalculator.createRecord(
                actionToUse,
                data.durationMinutes,
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
    const handleDeleteRecord = async (recordId: string) => {
        if (confirm('¿Eliminar esta actividad?')) {
            await SupabaseDataStore.deleteRecord(recordId);
            await loadData();
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

    if (isLoading) return <div className="loading">Cargando...</div>;

    const todayRecords = records.filter(r => r.date === getTodayString());
    const todayBalance = BalanceCalculator.getDailyBalance(todayRecords, getArgentinaDate());

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
                />

                {getQuickAdds()}

                <DailyMissionsCard missions={dailyMissions} loading={missionsLoading} />

                <div className="command-hub-layout">
                    {/* ROW 1: THE HEROES (POINTS & HISTORY) */}
                    <div className="hero-row">
                        <section className="the-forge materialized">
                            <div className={`accumulated-time-card ${accumulatedPoints >= 0 ? 'positive' : 'negative'} ethereal-border`}>
                                <p className="accumulated-label text-arcade">
                                    {accumulatedPoints >= 0 ? '✓ PUNTOS GANADOS' : '⚠ PUNTOS EN DEUDA'}
                                </p>
                                <StaticTimeDisplay totalPoints={accumulatedPoints} />
                                <div className="hero-decoration"></div>
                            </div>
                        </section>

                        <section className="the-chronicle">
                            <QuestCard title="Historial" subtitle={`${todayRecords.length} hoy`}>
                                {todayRecords.length === 0 ? (
                                    <p className="no-records">El pergamino está en blanco...</p>
                                ) : (
                                    <div className="records-list-hub">
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
                                                            <p className={`record-impact ${record.pointsCalculated >= 0 ? 'positive' : 'negative'}`}>
                                                                {record.pointsCalculated >= 0 ? '+' : ''}{Math.floor(record.pointsCalculated)}
                                                            </p>
                                                            <button
                                                                className="record-delete-hub"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteRecord(record.id);
                                                                }}
                                                                title="Eliminar registro"
                                                            >
                                                                ×
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
                                            {Math.floor(todayBalance.totalPoints)} pts acumulados hoy
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
        </main>
    );
}
