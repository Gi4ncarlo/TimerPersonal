'use client';

import { DailyMission } from '@/core/types';
import Twemoji from './Twemoji';
import './DailyMissionsCard.css';

interface DailyMissionsCardProps {
    missions: DailyMission[];
    loading?: boolean;
    streakDays?: number;
    rerollsUsed?: number;
    onReroll?: (missionId: string) => void;
    rerollingId?: string | null;
}

const TYPE_CONFIG: Record<DailyMission['missionType'], { icon: string; label: string }> = {
    threshold_positive: { icon: '🎯', label: 'Objetivo' },
    limit_negative: { icon: '🛡️', label: 'Límite' },
    consistency: { icon: '🔄', label: 'Variedad' },
};

const DIFFICULTY_CONFIG: Record<DailyMission['difficulty'], { label: string; dots: number }> = {
    easy: { label: 'Fácil', dots: 1 },
    medium: { label: 'Medio', dots: 2 },
    hard: { label: 'Difícil', dots: 3 },
};

function getProgressPercent(mission: DailyMission): number {
    if (mission.targetValue <= 0) return 0;
    if (mission.status === 'completed') return 100;
    if (mission.missionType === 'limit_negative') {
        const ratio = 1 - (mission.currentValue / mission.targetValue);
        return Math.max(0, Math.min(100, ratio * 100));
    }
    const ratio = mission.currentValue / mission.targetValue;
    return Math.min(100, ratio * 100);
}

function getProgressLabel(mission: DailyMission): string {
    if (mission.missionType === 'consistency') {
        return `${mission.currentValue}/${mission.targetValue}`;
    }
    return `${mission.currentValue}/${mission.targetValue}m`;
}

const CheckIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const XIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

export default function DailyMissionsCard({ missions, loading, streakDays = 0, rerollsUsed = 0, onReroll, rerollingId }: DailyMissionsCardProps) {
    if (loading) {
        return (
            <div className="dm-card">
                <div className="dm-loading">
                    <div className="dm-loading-bar" />
                    <span>Generando misiones...</span>
                </div>
            </div>
        );
    }

    if (missions.length === 0) return null;

    const completedCount = missions.filter(m => m.status === 'completed').length;
    const totalReward = missions
        .filter(m => m.status === 'completed')
        .reduce((sum, m) => sum + m.rewardPoints, 0);
    const allCompleted = completedCount === missions.length;

    const difficulty = missions[0]?.difficulty || 'easy';
    const diffConfig = DIFFICULTY_CONFIG[difficulty];
    const overallProgress = Math.round((completedCount / missions.length) * 100);

    // Calculate next level progress
    let nextLevelText = '';
    if (difficulty === 'easy') {
        const remaining = 3 - streakDays;
        nextLevelText = remaining > 0 ? `Faltan ${remaining} días para nivel Medio` : 'Sube a Medio mañana';
    } else if (difficulty === 'medium') {
        const remaining = 6 - streakDays;
        nextLevelText = remaining > 0 ? `Faltan ${remaining} días para nivel Difícil` : 'Sube a Difícil mañana';
    } else {
        nextLevelText = `¡Nivel Máximo! (Racha: ${streakDays})`;
    }

    return (
        <div className={`dm-card ${allCompleted ? 'dm-card--complete' : ''}`}>
            {/* Header */}
            <div className="dm-header">
                <div className="dm-header-left">
                    <div className="dm-header-icon">
                        <Twemoji emoji="⚔️" />
                    </div>
                    <div className="dm-header-text">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h3 className="dm-title">Misiones Diarias</h3>
                            <span className="dm-streak-badge" title={nextLevelText}>
                                🔥 {streakDays}
                            </span>
                        </div>
                        <span className="dm-subtitle" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span>{allCompleted ? '¡Todas completadas!' : `${completedCount} de ${missions.length} completadas`}</span>
                            {rerollsUsed < 2 && !allCompleted && (
                                <span className="dm-reroll-badge">
                                    <Twemoji emoji="🎲" /> {2 - rerollsUsed} cambios
                                </span>
                            )}
                        </span>
                    </div>
                </div>
                <div className="dm-header-right">
                    <div className={`dm-difficulty dm-difficulty--${difficulty}`}>
                        <div className="dm-diff-dots">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <span key={i} className={`dm-diff-dot ${i < diffConfig.dots ? 'active' : ''}`} />
                            ))}
                        </div>
                        <span className="dm-diff-label">{diffConfig.label}</span>
                    </div>
                </div>
            </div>

            {/* Overall progress bar */}
            <div className="dm-overall-progress">
                <div className="dm-overall-track">
                    <div
                        className={`dm-overall-fill ${allCompleted ? 'dm-overall-fill--done' : ''}`}
                        style={{ width: `${overallProgress}%` }}
                    />
                </div>
            </div>

            {/* Mission Items */}
            <div className="dm-list">
                {missions.map((mission, idx) => {
                    const typeConfig = TYPE_CONFIG[mission.missionType];
                    const progress = getProgressPercent(mission);
                    const isCompleted = mission.status === 'completed';
                    const isFailed = mission.status === 'failed';

                    return (
                        <div
                            key={mission.id}
                            className={`dm-item dm-item--${mission.status}`}
                            title={mission.description}
                            style={{ animationDelay: `${idx * 60}ms` }}
                        >
                            {/* Status indicator */}
                            <div className={`dm-status-dot dm-status-dot--${mission.status}`}>
                                {isCompleted ? <CheckIcon /> : isFailed ? <XIcon /> : null}
                            </div>

                            {/* Content */}
                            <div className="dm-item-body">
                                <div className="dm-item-top">
                                    <div className="dm-item-left">
                                        <span className="dm-type-icon">
                                            <Twemoji emoji={typeConfig.icon} />
                                        </span>
                                        <span className="dm-item-name">{mission.title}</span>
                                    </div>
                                    <div className="dm-item-right">
                                        <span className="dm-progress-label">{getProgressLabel(mission)}</span>
                                        <span className={`dm-reward ${isCompleted ? 'dm-reward--claimed' : ''}`}>
                                            <img src="/images/senda-coin-large-sinbg.png" alt="Senda" className="senda-floating-icon senda-floating-icon--sm" />
                                            {mission.rewardPoints}
                                        </span>
                                        {!isCompleted && rerollsUsed < 2 && onReroll && (
                                            <button
                                                className="dm-reroll-btn"
                                                onClick={() => onReroll(mission.id)}
                                                disabled={rerollingId === mission.id}
                                                title="Cambiar misión (aleatorio)"
                                            >
                                                {rerollingId === mission.id ? <span className="btn-loader"></span> : <Twemoji emoji="🎲" />}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Progress bar */}
                                <div className="dm-progress-track">
                                    <div
                                        className={`dm-progress-fill dm-progress-fill--${mission.status}`}
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            {totalReward > 0 && (
                <div className="dm-footer">
                    <div className="dm-footer-reward">
                        <span className="dm-footer-icon">✦</span>
                        <span>Bonus ganado: <strong style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', verticalAlign: 'middle' }}><img src="/images/senda-coin-large-sinbg.png" alt="Senda" className="senda-floating-icon senda-floating-icon--sm" />{totalReward}</strong></span>
                    </div>
                </div>
            )}
        </div>
    );
}
