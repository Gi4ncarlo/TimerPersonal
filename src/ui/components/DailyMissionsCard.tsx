'use client';

import { DailyMission } from '@/core/types';
import Twemoji from './Twemoji';
import './DailyMissionsCard.css';

interface DailyMissionsCardProps {
    missions: DailyMission[];
    loading?: boolean;
}

const TYPE_CONFIG: Record<DailyMission['missionType'], { icon: string; label: string }> = {
    threshold_positive: { icon: '🎯', label: 'Objetivo' },
    limit_negative: { icon: '🛡️', label: 'Límite' },
    consistency: { icon: '🔄', label: 'Variedad' },
};

const STATUS_ICONS: Record<DailyMission['status'], string> = {
    in_progress: '🟡',
    completed: '✅',
    failed: '❌',
};

const DIFFICULTY_LABELS: Record<DailyMission['difficulty'], string> = {
    easy: 'Fácil',
    medium: 'Medio',
    hard: 'Difícil',
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
    // For time based, just show current/target without 'min' to save space
    return `${mission.currentValue}/${mission.targetValue}m`;
}

export default function DailyMissionsCard({ missions, loading }: DailyMissionsCardProps) {
    if (loading) {
        return (
            <div className="daily-missions-card">
                <div className="missions-loading">Generando misiones...</div>
            </div>
        );
    }

    if (missions.length === 0) return null;

    const completedCount = missions.filter(m => m.status === 'completed').length;
    const totalReward = missions
        .filter(m => m.status === 'completed')
        .reduce((sum, m) => sum + m.rewardPoints, 0);

    const difficulty = missions[0]?.difficulty || 'easy';

    return (
        <div className="daily-missions-card">
            {/* Compact Header */}
            <div className="missions-header">
                <div className="missions-title-group">
                    <span className="missions-icon"><Twemoji emoji="⚔️" /></span>
                    <h3 className="missions-title">Misiones Diarias</h3>
                </div>
                <span className={`missions-difficulty-label ${difficulty}`}>
                    {DIFFICULTY_LABELS[difficulty]}
                </span>
            </div>

            {/* List */}
            <div className="missions-list">
                {missions.map(mission => {
                    const typeConfig = TYPE_CONFIG[mission.missionType];
                    const progress = getProgressPercent(mission);
                    const statusIcon = STATUS_ICONS[mission.status];

                    return (
                        <div
                            key={mission.id}
                            className={`mission-item ${mission.status}`}
                            title={mission.description} // Tooltip approach
                        >
                            {/* Left: Icon + Title */}
                            <div className="mission-icon-area">
                                <span className="mission-type-icon">
                                    <Twemoji emoji={typeConfig.icon} />
                                </span>
                                <span className="mission-name">{mission.title}</span>
                            </div>

                            {/* Right: Meta, Progress, Status */}
                            <div className="mission-meta-area">
                                <span className={`mission-reward-badge ${mission.status === 'completed' ? 'claimed' : ''}`}>
                                    +{mission.rewardPoints}pts
                                </span>

                                <div className="mission-progress-compact">
                                    <div
                                        className={`mission-progress-fill ${mission.status}`}
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>

                                <span className="mission-progress-text">
                                    {getProgressLabel(mission)}
                                </span>

                                <span className="mission-status-icon">
                                    <Twemoji emoji={statusIcon} />
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Micro Footer */}
            <div className="missions-summary">
                <span>Progreso: <strong>{completedCount}/{missions.length}</strong></span>
                {totalReward > 0 && <span>Bonus: <strong>+{totalReward}</strong></span>}
            </div>
        </div>
    );
}
