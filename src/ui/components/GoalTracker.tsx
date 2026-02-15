import { useState } from 'react';
import { Goal, Action } from '@/core/types';
import WeeklyCountdown from './WeeklyCountdown';
import { getTodayString } from '@/core/utils/dateUtils';
import './GoalTracker.css';

interface GoalTrackerProps {
    goals: Goal[];
    actions: Action[];
    onCreateGoal: (title: string, target: number, actionId?: string, metricType?: string, metricUnit?: string, period?: string) => void;
    onDeleteGoal: (id: string) => void;
}

type PeriodTab = 'weekly' | 'monthly' | 'milestone';

export default function GoalTracker({ goals, actions, onCreateGoal, onDeleteGoal }: GoalTrackerProps) {
    const [activeTab, setActiveTab] = useState<PeriodTab>('weekly');
    const [isAdding, setIsAdding] = useState(false);

    // Form State
    const [newTitle, setNewTitle] = useState('');
    const [newTarget, setNewTarget] = useState(100);
    const [selectedActionId, setSelectedActionId] = useState<string>('');
    const [selectedMetricType, setSelectedMetricType] = useState<string>('activities');
    const [selectedPeriod, setSelectedPeriod] = useState<string>('weekly');

    const [showCompleted, setShowCompleted] = useState(false);
    const [showFailed, setShowFailed] = useState(false);

    const today = getTodayString();

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
                metricUnit = selectedMetricType === 'activities' ? (activeTab === 'milestone' ? 'completado' : 'veces') : 'puntos';
            }

            onCreateGoal(newTitle, newTarget, selectedActionId || undefined, selectedMetricType, metricUnit, selectedPeriod);

            // Reset
            setNewTitle('');
            setNewTarget(100);
            setSelectedActionId('');
            setSelectedMetricType('activities');
            setIsAdding(false);
        }
    };
    const getProgressDisplay = (goal: Goal) => {
        const unit = goal.metricUnit || '';
        const displayValue = goal.type === 'duration' || goal.metricType === 'hours'
            ? Number(goal.currentValue).toFixed(1).replace('.0', '')
            : goal.currentValue;

        if (goal.metricType === 'activities' && !unit) {
            return `${displayValue} / ${goal.targetValue} veces`.trim();
        }

        return `${displayValue} / ${goal.targetValue} ${unit}`.trim();
    };

    // Filtering logic
    const filteredGoals = goals.filter(g => {
        if (activeTab === 'weekly') return g.period === 'weekly';
        if (activeTab === 'monthly') return g.period === 'monthly' || g.period === 'annual';
        if (activeTab === 'milestone') return g.period === 'milestone';
        return true;
    });

    const activeGoals = filteredGoals.filter(g => !g.isCompleted && (!g.endDate || g.endDate >= today));
    const completedGoals = filteredGoals.filter(g => g.isCompleted);
    const failedGoals = filteredGoals.filter(g => !g.isCompleted && g.endDate && g.endDate < today);

    return (
        <div className="goal-tracker-card">
            {activeTab === 'weekly' && <WeeklyCountdown />}

            {/* Period Tabs */}
            <div className="goal-tabs">
                <button
                    className={`tab-btn ${activeTab === 'weekly' ? 'active' : ''}`}
                    onClick={() => setActiveTab('weekly')}
                >
                    Semanales
                </button>
                <button
                    className={`tab-btn ${activeTab === 'monthly' ? 'active' : ''}`}
                    onClick={() => setActiveTab('monthly')}
                >
                    Mes / Año
                </button>
                <button
                    className={`tab-btn ${activeTab === 'milestone' ? 'active' : ''}`}
                    onClick={() => setActiveTab('milestone')}
                >
                    ✨ Hitos
                </button>
            </div>

            <div className="goal-header">
                <h3 className="goal-section-title">
                    {activeTab === 'weekly' ? '🎯 Objetivos Semanales' :
                        activeTab === 'monthly' ? '📅 Planificación Pro' :
                            '🏆 Grandes Sueños'}
                </h3>
                <button
                    className="add-goal-btn"
                    onClick={() => {
                        setIsAdding(!isAdding);
                        setSelectedPeriod(activeTab === 'milestone' ? 'milestone' : activeTab === 'monthly' ? 'monthly' : 'weekly');
                    }}
                >
                    {isAdding ? 'cancelar' : '+ Nuevo'}
                </button>
            </div>

            {isAdding && (
                <form onSubmit={handleSubmit} className="new-goal-form tiered-form">
                    <div className="form-group">
                        <label>Título del Objetivo</label>
                        <input
                            type="text"
                            placeholder={activeTab === 'milestone' ? "Ej: Comprar camioneta" : "Ej: Leer 100 páginas"}
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            className="goal-input"
                            autoFocus
                        />
                    </div>

                    <div className="goal-input-row">
                        <div className="form-group flex-1">
                            <label>Periodo</label>
                            <select
                                value={selectedPeriod}
                                onChange={(e) => setSelectedPeriod(e.target.value)}
                                className="goal-select-input"
                            >
                                <option value="weekly">Semanal</option>
                                <option value="monthly">Mensual</option>
                                <option value="annual">Anual</option>
                                <option value="milestone">Hito Especial</option>
                            </select>
                        </div>

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
                    </div>

                    <div className="goal-input-row">
                        <div className="form-group flex-1">
                            <label>Métrica</label>
                            <select
                                value={selectedMetricType}
                                onChange={(e) => setSelectedMetricType(e.target.value)}
                                className="goal-select-input"
                            >
                                <option value="activities">Veces / Cantidad</option>
                                <option value="pages">Páginas</option>
                                <option value="hours">Horas</option>
                                <option value="kilometers">Kilómetros</option>
                                <option value="points">Puntos</option>
                            </select>
                            {selectedMetricType === 'activities' && (
                                <p className="field-hint">Ideal para ventas, tareas, etc.</p>
                            )}
                        </div>

                        <div className="form-group flex-1">
                            <label>Meta (Valor)</label>
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

            <div className={`goals-list ${activeTab}-list`}>
                {activeGoals.length === 0 && !isAdding && (
                    <p className="no-goals">
                        {activeTab === 'milestone'
                            ? 'No tienes hitos de vida definidos. ¡Es momento de soñar en grande!'
                            : 'No tienes objetivos activos para este periodo.'}
                    </p>
                )}

                {activeGoals.map(goal => (
                    <div key={goal.id} className={`goal-item ${goal.period}-item ${goal.period === 'milestone' ? 'milestone-card' : ''}`}>
                        <div className="goal-info">
                            <div className="title-stack">
                                <span className="goal-title">{goal.title}</span>
                                {goal.period !== 'weekly' && <span className="period-badge">{goal.period}</span>}
                            </div>
                            <span className="goal-progress-text">
                                {getProgressDisplay(goal)}
                            </span>
                        </div>
                        <div className="goal-bar-bg">
                            <div
                                className="goal-bar-fill"
                                style={{
                                    width: `${Math.min(100, (goal.currentValue / goal.targetValue) * 100)}%`,
                                    background: goal.period === 'milestone' ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : undefined
                                }}
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
                                        <div className="title-stack">
                                            <span className="goal-title">{goal.title}</span>
                                            <span className="period-badge">{goal.period}</span>
                                        </div>
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
                                        <div className="title-stack">
                                            <span className="goal-title">{goal.title}</span>
                                            {goal.period !== 'weekly' && <span className="period-badge">{goal.period}</span>}
                                        </div>
                                        <span className="goal-badge">¡COMPLETADO!</span>
                                    </div>
                                    <div className="goal-bar-bg">
                                        <div
                                            className="goal-bar-fill"
                                            style={{ width: '100%', background: goal.period === 'milestone' ? 'linear-gradient(90deg, #f59e0b, #d97706)' : undefined }}
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

