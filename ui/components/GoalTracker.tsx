'use client';

import { useState } from 'react';
import { Goal, Action } from '@/core/types';
import './GoalTracker.css';

interface GoalTrackerProps {
    goals: Goal[];
    actions: Action[]; // NEW: Need actions list to select from
    onCreateGoal: (title: string, target: number, actionId?: string, metricType?: string, metricUnit?: string) => void;
    onDeleteGoal: (id: string) => void;
}

export default function GoalTracker({ goals, actions, onCreateGoal, onDeleteGoal }: GoalTrackerProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newTarget, setNewTarget] = useState(100);
    const [selectedActionId, setSelectedActionId] = useState<string>('');
    const [selectedMetricType, setSelectedMetricType] = useState<string>('activities');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTitle && newTarget > 0) {
            // Determine metric unit based on selected action and metric type
            let metricUnit = '';
            if (selectedActionId) {
                const action = actions.find(a => a.id === selectedActionId);
                if (action?.metadata?.inputType === 'pages') {
                    metricUnit = 'páginas';
                } else if (action?.metadata?.inputType === 'distance-time') {
                    metricUnit = selectedMetricType === 'kilometers' ? 'km' : 'horas';
                } else if (action?.metadata?.inputType === 'hours' || action?.metadata?.inputType.includes('time')) {
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

    // Get display text for goal progress
    const getProgressDisplay = (goal: Goal) => {
        const unit = goal.metricUnit || '';
        return `${goal.currentValue} / ${goal.targetValue} ${unit}`.trim();
    };

    return (
        <div className="goal-tracker-card">
            <div className="goal-header">
                <h3 className="goal-section-title">🎯 Objetivos Semanales</h3>
                <button
                    className="add-goal-btn"
                    onClick={() => setIsAdding(!isAdding)}
                >
                    {isAdding ? '✕' : '+ Nuevo'}
                </button>
            </div>

            {isAdding && (
                <form onSubmit={handleSubmit} className="new-goal-form">
                    <input
                        type="text"
                        placeholder="Ej: Leer 100 páginas"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="goal-input"
                        autoFocus
                    />

                    <div className="goal-input-row">
                        <select
                            value={selectedActionId}
                            onChange={(e) => {
                                setSelectedActionId(e.target.value);
                                // Auto-detect metric type based on action
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
                            <option value="">Todas las actividades</option>
                            {actions.filter(a => a.type === 'positive').map(action => (
                                <option key={action.id} value={action.id}>{action.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="goal-input-row">
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

                        <input
                            type="number"
                            placeholder="Meta"
                            value={newTarget}
                            onChange={(e) => setNewTarget(parseInt(e.target.value))}
                            className="goal-number-input"
                        />
                        <button type="submit" className="save-goal-btn">Guardar</button>
                    </div>
                </form>
            )}

            <div className="goals-list">
                {goals.length === 0 && !isAdding && (
                    <p className="no-goals">No tienes objetivos activos.</p>
                )}

                {goals.map(goal => (
                    <div key={goal.id} className={`goal-item ${goal.isCompleted ? 'completed' : ''}`}>
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
                        {goal.isCompleted && <span className="goal-badge">¡COMPLETADO! +200 XP</span>}
                        <button
                            className="delete-goal-btn"
                            onClick={(e) => { e.stopPropagation(); onDeleteGoal(goal.id); }}
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
