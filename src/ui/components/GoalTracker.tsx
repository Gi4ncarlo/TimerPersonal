import { useState } from 'react';
import { Goal, Action } from '@/core/types';
import WeeklyCountdown from './WeeklyCountdown';
import { getTodayString } from '@/core/utils/dateUtils';
import './GoalTracker.css';

interface GoalTrackerProps {
    goals: Goal[];
    actions: Action[];
    onCreateGoal: (title: string, target: number, actionId?: string, metricType?: string, metricUnit?: string) => void;
    onDeleteGoal: (id: string) => void;
}

export default function GoalTracker({ goals, actions, onCreateGoal, onDeleteGoal }: GoalTrackerProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newTarget, setNewTarget] = useState(100);
    const [selectedActionId, setSelectedActionId] = useState<string>('');
    const [selectedMetricType, setSelectedMetricType] = useState<string>('activities');
    const [showCompleted, setShowCompleted] = useState(false);
    const [showFailed, setShowFailed] = useState(false);

    const today = getTodayString();

    const activeGoals = goals.filter(g => !g.isCompleted && (!g.endDate || g.endDate >= today));
    const completedGoals = goals.filter(g => g.isCompleted);
    const failedGoals = goals.filter(g => !g.isCompleted && g.endDate && g.endDate < today);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTitle && newTarget > 0) {
            let metricUnit = '';
            if (selectedActionId) {
                const action = actions.find(a => a.id === selectedActionId);
                if (action?.metadata?.inputType === 'pages') {
                    metricUnit = 'páginas';
                } else if (action?.metadata?.inputType === 'distance-time') {
                    metricUnit = selectedMetricType === 'kilometers' ? 'km' : 'horas';
                } else if (action?.metadata?.inputType === 'hours' || action?.metadata?.inputType?.includes('time')) {
                    metricUnit = 'horas';
                }
            } else {
                metricUnit = selectedMetricType === 'activities' ? 'actividades' : 'puntos';
            }

            onCreateGoal(newTitle, newTarget, selectedActionId || undefined, selectedMetricType, metricUnit);
            setNewTitle('');
            setNewTarget(100);
            setSelectedActionId('');
            setSelectedMetricType('activities');
            setIsAdding(false);
        }
    };

    const getProgressDisplay = (goal: Goal) => {
        const unit = goal.metricUnit || '';
        // If it's a duration goal, and current value is not integer, show 1 decimal
        const displayValue = goal.type === 'duration' || goal.metricType === 'hours'
            ? Number(goal.currentValue).toFixed(1).replace('.0', '')
            : goal.currentValue;
        return `${displayValue} / ${goal.targetValue} ${unit}`.trim();
    };

    return (
        <div className="goal-tracker-card">
            <WeeklyCountdown />

            <div className="goal-header">
                <h3 className="goal-section-title">🎯 Objetivos Semanales</h3>
                <button
                    className="add-goal-btn"
                    onClick={() => setIsAdding(!isAdding)}
                >
                    {isAdding ? 'cancelar' : '+ Nuevo Objetivo'}
                </button>
            </div>

            {isAdding && (
                <form onSubmit={handleSubmit} className="new-goal-form">
                    <div className="form-group">
                        <label>Título del Objetivo</label>
                        <input
                            type="text"
                            placeholder="Ej: Leer 100 páginas"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            className="goal-input"
                            autoFocus
                        />
                    </div>

                    <div className="goal-input-row">
                        <div className="form-group flex-2">
                            <label>Actividad Relacionada</label>
                            <select
                                value={selectedActionId}
                                onChange={(e) => {
                                    setSelectedActionId(e.target.value);
                                    const action = actions.find(a => a.id === e.target.value);
                                    if (action?.metadata?.inputType === 'pages') {
                                        setSelectedMetricType('pages');
                                    } else if (action?.metadata?.inputType === 'distance-time') {
                                        setSelectedMetricType('kilometers');
                                    } else if (action?.metadata?.inputType?.includes('time')) {
                                        setSelectedMetricType('hours');
                                    }
                                }}
                                className="goal-select-input"
                            >
                                <option value="">Cualquera (Global)</option>
                                {actions.filter(a => a.type === 'positive').map(action => (
                                    <option key={action.id} value={action.id}>{action.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group flex-1">
                            <label>Métrica</label>
                            <select
                                value={selectedMetricType}
                                onChange={(e) => setSelectedMetricType(e.target.value)}
                                className="goal-select-input"
                            >
                                <option value="activities">Actividades</option>
                                <option value="pages">Páginas</option>
                                <option value="hours">Horas</option>
                                <option value="kilometers">Kilómetros</option>
                                <option value="points">Puntos</option>
                            </select>
                        </div>

                        <div className="form-group flex-1">
                            <label>Meta</label>
                            <input
                                type="number"
                                placeholder="100"
                                value={newTarget}
                                onChange={(e) => setNewTarget(parseInt(e.target.value))}
                                className="goal-number-input"
                                min="1"
                            />
                        </div>
                    </div>

                    <button type="submit" className="save-goal-btn">Guardar Objetivo</button>
                </form>
            )}

            <div className="goals-list">
                {activeGoals.length === 0 && !isAdding && (
                    <p className="no-goals">No tienes objetivos activos para esta semana.</p>
                )}

                {activeGoals.map(goal => (
                    <div key={goal.id} className="goal-item">
                        <div className="goal-info">
                            <span className="goal-title">{goal.title}</span>
                            <span className="goal-progress-text">
                                {getProgressDisplay(goal)}
                            </span>
                        </div>
                        <div className="goal-bar-bg">
                            <div
                                className="goal-bar-fill"
                                style={{ width: `${Math.min(100, (goal.currentValue / goal.targetValue) * 100)}%` }}
                            />
                        </div>
                        <button
                            className="delete-goal-btn"
                            onClick={(e) => { e.stopPropagation(); onDeleteGoal(goal.id); }}
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>

            {failedGoals.length > 0 && (
                <div className="failed-goals-section">
                    <button
                        className="toggle-failed-btn"
                        onClick={() => setShowFailed(!showFailed)}
                    >
                        {showFailed ? 'Ocultar' : 'Ver'} incumplidos ({failedGoals.length})
                    </button>

                    {showFailed && (
                        <div className="goals-list failed-list">
                            {failedGoals.map(goal => (
                                <div key={goal.id} className="goal-item failed">
                                    <div className="goal-info">
                                        <span className="goal-title">{goal.title}</span>
                                        <span className="goal-badge failed">INCUMPLIDO</span>
                                    </div>
                                    <div className="goal-bar-bg">
                                        <div
                                            className="goal-bar-fill"
                                            style={{ width: `${Math.min(100, (goal.currentValue / goal.targetValue) * 100)}%`, background: '#ff4444' }}
                                        />
                                    </div>
                                    <button
                                        className="delete-goal-btn"
                                        onClick={(e) => { e.stopPropagation(); onDeleteGoal(goal.id); }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {completedGoals.length > 0 && (
                <div className="completed-goals-section">
                    <button
                        className="toggle-completed-btn"
                        onClick={() => setShowCompleted(!showCompleted)}
                    >
                        {showCompleted ? 'Ocultar' : 'Ver'} completados ({completedGoals.length})
                    </button>

                    {showCompleted && (
                        <div className="goals-list completed-list">
                            {completedGoals.map(goal => (
                                <div key={goal.id} className="goal-item completed">
                                    <div className="goal-info">
                                        <span className="goal-title">{goal.title}</span>
                                        <span className="goal-badge">¡COMPLETADO!</span>
                                    </div>
                                    <div className="goal-bar-bg">
                                        <div
                                            className="goal-bar-fill"
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <button
                                        className="delete-goal-btn"
                                        onClick={(e) => { e.stopPropagation(); onDeleteGoal(goal.id); }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

