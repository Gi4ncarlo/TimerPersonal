'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import QuestCard from '@/ui/components/QuestCard';
import ActionItem from '@/ui/components/ActionItem';
import ActivityModal from '@/ui/components/ActivityModal';
import StaticTimeDisplay from '@/ui/components/StaticTimeDisplay';
import UserLevel from '@/ui/components/UserLevel';
import GoalTracker from '@/ui/components/GoalTracker';
import { SupabaseDataStore } from '@/data/supabaseData';
import { BalanceCalculator } from '@/core/services/BalanceCalculator';
import { PointsCalculator } from '@/core/services/PointsCalculator';
import { Action, DailyRecord, Goal } from '@/core/types';
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

    const [selectedAction, setSelectedAction] = useState<Action | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [accumulatedPoints, setAccumulatedPoints] = useState(0); // Changed from accumulatedTimeMinutes
    const [isLoading, setIsLoading] = useState(true);

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

    const handleQuickAdd = async (actionId: string, minutes: number, note: string) => {
        const action = actions.find(a => a.id === actionId);
        if (!action) return;
        await handleModalSubmit({ durationMinutes: minutes, notes: note }, action);
    };

    const handleModalSubmit = async (data: { durationMinutes: number; metricValue?: number; notes: string }, overrideAction?: Action) => {
        const actionToUse = overrideAction || selectedAction;
        if (!actionToUse) return;

        try {
            const newRecord = PointsCalculator.createRecord(
                actionToUse,
                data.durationMinutes,
                new Date().toISOString().split('T')[0],
                data.notes,
                data.metricValue
            );

            await SupabaseDataStore.createRecord(newRecord);
            await loadData(); // Reload everything (XP, Goals, etc.)
        } catch (error) {
            console.error('Error creating record:', error);
            alert('Error al guardar la actividad');
        }
    };

    const handleCreateGoal = async (title: string, targetValue: number, actionId?: string, metricType?: string, metricUnit?: string) => {
        try {
            await SupabaseDataStore.createGoal({
                title,
                type: metricType === 'points' ? 'points' : metricType === 'hours' ? 'duration' : 'count',
                targetValue,
                actionId,
                metricType: metricType as any,
                metricUnit,
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

    // Quick Add Presets (Hardcoded for common use cases or based on existing actons)
    const getQuickAdds = () => {
        const studyAction = actions.find(a => a.name.includes('Estudiar'));
        const workAction = actions.find(a => a.name.includes('Trabajar'));
        const readAction = actions.find(a => a.name.includes('Leer'));

        return (
            <div className="quick-add-bar">
                {studyAction && (
                    <button className="quick-add-btn" onClick={() => handleQuickAdd(studyAction.id, 60, 'Sesión rápida 1h')}>
                        ⚡ Estudiar 1h
                    </button>
                )}
                {workAction && (
                    <button className="quick-add-btn" onClick={() => handleQuickAdd(workAction.id, 30, 'Sprint 30min')}>
                        ⚡ Trabajo 30m
                    </button>
                )}
                {readAction && (
                    <button className="quick-add-btn" onClick={() => handleQuickAdd(readAction.id, 30, '10 páginas (aprox)')}>
                        ⚡ Leer 10 pág
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
                        <h1 className="main-title">Actividad Personal</h1>
                        {/* User Level Component */}
                        <UserLevel level={userLevel.level} xp={userLevel.xp} />
                    </div>

                    <div className="header-actions">
                        <Link href="/leaderboard" className="nav-link">🏆 Leaderboard</Link>
                        <Link href="/estadisticas" className="nav-link">📊 Estadísticas</Link>
                        <Link href="/analisis-ia" className="nav-link">🤖 Análisis IA</Link>
                        <button className="logout-btn" onClick={handleLogout}>Salir</button>
                    </div>
                </header>

                {getQuickAdds()}

                <div className="dashboard-grid-new">
                    {/* LEFT COLUMN */}
                    <div className="left-column">
                        {/* Accumulated Points */}
                        <div className={`accumulated-time-card ${accumulatedPoints >= 0 ? 'positive' : 'negative'}`}>
                            <p className="accumulated-label">
                                {accumulatedPoints >= 0 ? '✓ PUNTOS GANADOS' : '⚠ PUNTOS EN DEUDA'}
                            </p>
                            <StaticTimeDisplay totalPoints={accumulatedPoints} />
                        </div>

                        {/* Goals Tracker */}
                        <GoalTracker
                            goals={goals}
                            actions={actions}
                            onCreateGoal={handleCreateGoal}
                            onDeleteGoal={handleDeleteGoal}
                        />

                        {/* Daily History */}
                        <QuestCard title="HISTORIAL DE HOY" subtitle={`${todayRecords.length} actividades`}>
                            {/* Same history list code... */}
                            {todayRecords.length === 0 ? (
                                <p className="no-records">No hay actividades hoy</p>
                            ) : (
                                <div className="records-list">
                                    {todayRecords.map(record => (
                                        <div key={record.id} className="record-item">
                                            <div className="record-header">
                                                <span className="record-name">{record.actionName}</span>
                                                <button className="record-delete" onClick={() => handleDeleteRecord(record.id)}>✕</button>
                                            </div>
                                            <p className="record-notes">{record.notes}</p>
                                            <p className={`record-impact ${record.pointsCalculated >= 0 ? 'positive' : 'negative'}`}>
                                                {record.pointsCalculated >= 0 ? '+' : ''}{Math.floor(record.pointsCalculated)} pts
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="today-summary">
                                <p className="summary-line">
                                    <span>Balance de hoy:</span>
                                    <strong className={todayBalance.totalPoints >= 0 ? 'positive' : 'negative'}>
                                        {todayBalance.totalPoints >= 0 ? '+' : ''}
                                        {Math.floor(todayBalance.totalPoints)} pts
                                    </strong>
                                </p>
                            </div>
                        </QuestCard>
                    </div>

                    {/* RIGHT COLUMN - Actions Selection */}
                    <div className="actions-panel">
                        <QuestCard title="AGREGAR ACTIVIDAD" subtitle={format(new Date(), 'dd/MM/yyyy', { locale: es })}>
                            {/* Same Actions List code... */}
                            <div className="actions-section">
                                <h3 className="goal-title">Positivas</h3>
                                {actions.filter(a => a.type === 'positive').map(action => (
                                    <ActionItem key={action.id} action={action} progress="" onAdd={() => handleActionClick(action)} />
                                ))}
                            </div>
                            <div className="section-divider" />
                            <div className="actions-section negative-section">
                                <h4 className="section-label">Negativas</h4>
                                {actions.filter(a => a.type === 'negative').map(action => (
                                    <ActionItem key={action.id} action={action} progress="" onAdd={() => handleActionClick(action)} />
                                ))}
                            </div>
                        </QuestCard>
                    </div>
                </div>
            </div>

            {selectedAction && (
                <ActivityModal
                    action={selectedAction}
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSubmit={(data) => handleModalSubmit(data)}
                />
            )}
        </main>
    );
}
