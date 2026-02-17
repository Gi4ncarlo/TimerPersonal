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
import { SupabaseDataStore } from '@/data/supabaseData';
import { BalanceCalculator } from '@/core/services/BalanceCalculator';
import { PointsCalculator } from '@/core/services/PointsCalculator';
import { StrikeDetector } from '@/core/services/StrikeDetector';
import { Action, DailyRecord, Goal, Strike, User } from '@/core/types';
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

            const [fetchedActions, fetchedRecords, fetchedGoals] = await Promise.all([
                SupabaseDataStore.getActions(),
                SupabaseDataStore.getRecords(),
                SupabaseDataStore.getGoals(),
            ]);

            setActions(fetchedActions);
            setRecords(fetchedRecords);
            setGoals(fetchedGoals);

            // Calculate total points (already in points, no conversion needed)
            const totalPoints = fetchedRecords.reduce((sum, r) => sum + r.pointsCalculated, 0);
            setAccumulatedPoints(totalPoints);

            // Check for missed days (multi-day strikes)
            const missedDays = StrikeDetector.detectMissedDays(fetchedRecords);
            if (missedDays.length > 0) {
                const newStrikes = await SupabaseDataStore.processMissedStrikes(missedDays);
                if (newStrikes.length > 0) {
                    setLatestStrikes(newStrikes);
                    setShowStrikeWarning(true);
                }
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

    const handleCreateAction = async (name: string, type: 'positive' | 'negative', points: number) => {
        try {
            await SupabaseDataStore.createAction({
                name,
                type,
                pointsPerMinute: points,
                metadata: { inputType: 'impact' } // Personal actions are usually impact-based (fixed points)
            });
            await loadData();
        } catch (error) {
            console.error('Error creating action:', error);
            alert('Error al crear la actividad');
        }
    };

    // Quick Add Presets (Hardcoded for common use cases or based on existing actons)
    const getQuickAdds = () => {
        const studyAction = actions.find(a => a.name.includes('Estudiar'));
        const workAction = actions.find(a => a.name.includes('Trabajar'));
        const readAction = actions.find(a => a.name.includes('Leer'));

        return (
            <div className="quick-add-bar">
                {studyAction && (
                    <button
                        className="quick-add-btn"
                        onClick={() => handleQuickAdd(studyAction.id, 60, 'Sesión rápida 1h')}
                        disabled={loadingActionId === studyAction.id}
                    >
                        {loadingActionId === studyAction.id ? (
                            <span className="btn-loader"></span>
                        ) : (
                            <><Twemoji emoji="⚡" /> Estudiar 1h</>
                        )}
                    </button>
                )}
                {workAction && (
                    <button
                        className="quick-add-btn"
                        onClick={() => handleQuickAdd(workAction.id, 30, 'Sprint 30min')}
                        disabled={loadingActionId === workAction.id}
                    >
                        {loadingActionId === workAction.id ? (
                            <span className="btn-loader"></span>
                        ) : (
                            <><Twemoji emoji="⚡" /> Trabajo 30m</>
                        )}
                    </button>
                )}
                {readAction && (
                    <button
                        className="quick-add-btn"
                        onClick={() => handleQuickAdd(readAction.id, 30, '10 páginas (aprox)', 10)}
                        disabled={loadingActionId === readAction.id}
                    >
                        {loadingActionId === readAction.id ? (
                            <span className="btn-loader"></span>
                        ) : (
                            <><Twemoji emoji="📚" /> Leer 10 pág</>
                        )}
                    </button>
                )}
            </div>
        );
    };

    if (isLoading) return <div className="loading">Cargando...</div>;

    const todayRecords = records.filter(r => r.date === getTodayString());
    const todayBalance = BalanceCalculator.getDailyBalance(todayRecords, getArgentinaDate());

    return (
        <main className="dashboard">
            <div className="dashboard-container-new">
                <header className="dashboard-header">
                    <div className="title-area">
                        <h1 className="main-title">Senda de Logros</h1>
                        {/* User Level Component - Now Clickable */}
                        <UserLevel
                            level={userLevel.level}
                            xp={userLevel.xp}
                            avatarUrl={currentUser?.avatarUrl}
                            onClick={() => setIsProfileModalOpen(true)}
                        />
                    </div>

                    <div className="header-actions">
                        <Link href="/leaderboard" className="nav-link">🏆 Leaderboard</Link>
                        <Link href="/estadisticas" className="nav-link">📊 Estadísticas</Link>
                        {currentUser?.role === 'admin' && (
                            <Link href="/dashboard/admin" className="nav-link" style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}>🛠 Admin</Link>
                        )}
                        <Link href="/strikes" className="nav-link" style={{ color: '#ff4444', borderColor: '#ff4444' }}>⚠️ Strikes</Link>
                        <button
                            className={`nav-link armory-toggle ${isArmoryOpen ? 'active' : ''}`}
                            onClick={() => setIsArmoryOpen(!isArmoryOpen)}
                            title="Desplegar Arsenal de Acciones"
                        >
                            ⚔️ Arsenal
                        </button>
                        <button className="logout-btn" onClick={handleLogout}>Salir</button>
                    </div>
                </header>

                {getQuickAdds()}

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
                                                        <span className="record-name">{record.actionName}</span>
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
                                                            {record.notes}
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
                            <button className="close-console" onClick={() => setIsArmoryOpen(false)}>×</button>
                        </div>

                        <div className="console-body">
                            <h3 className="section-label-alt text-arcade">Disciplinas</h3>
                            <div className="actions-list-console">
                                {actions.filter(a => a.type === 'positive').map(action => (
                                    <ActionItem key={action.id} action={action} progress="" onAdd={() => handleActionClick(action)} />
                                ))}
                            </div>
                            <div className="console-divider" />
                            <h3 className="section-label-alt text-arcade">Debilidades</h3>
                            <div className="actions-list-console">
                                {actions.filter(a => a.type === 'negative').map(action => (
                                    <ActionItem key={action.id} action={action} progress="" onAdd={() => handleActionClick(action)} />
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
                    onClose={() => setIsProfileModalOpen(false)}
                    onUpdate={() => loadData()}
                />
            )}

            <CreateActionModal
                isOpen={isCreateActionModalOpen}
                onClose={() => setIsCreateActionModalOpen(false)}
                onSubmit={handleCreateAction}
            />
        </main>
    );
}
