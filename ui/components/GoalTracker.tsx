'use client';

import { useState } from 'react';
import { Goal } from '@/core/types';
import './GoalTracker.css';

interface GoalTrackerProps {
    goals: Goal[];
    onCreateGoal: (title: string, target: number) => void;
    onDeleteGoal: (id: string) => void;
}

export default function GoalTracker({ goals, onCreateGoal, onDeleteGoal }: GoalTrackerProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newTarget, setNewTarget] = useState(100);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTitle && newTarget > 0) {
            onCreateGoal(newTitle, newTarget);
            setNewTitle('');
            setNewTarget(100);
            setIsAdding(false);
        }
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
                        <input
                            type="number"
                            placeholder="Meta (pts/min)"
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
                                {goal.currentValue} / {goal.targetValue}
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
