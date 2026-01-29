import { useRef, useEffect } from 'react';
import './UserStatsModal.css';

interface LeaderboardEntry {
    id: string;
    userId: string;
    username: string;
    totalPoints: number;
    positiveActivities: number;
    negativeActivities: number;
    goalsCompleted: number;
    pointsLast24hPositive?: number;
    pointsLast24hNegative?: number;
    weekStart: string;
    weekEnd: string;
}

interface UserStatsModalProps {
    entry: LeaderboardEntry;
    isOpen: boolean;
    onClose: () => void;
}

export default function UserStatsModal({ entry, isOpen, onClose }: UserStatsModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // Calculate derived stats
    const totalActivities = entry.positiveActivities + entry.negativeActivities;
    const avgPointsPerActivity = totalActivities > 0
        ? Math.floor(entry.totalPoints / totalActivities)
        : 0;

    return (
        <div className="stats-modal-overlay">
            <div className="stats-modal-content" ref={modalRef}>
                <div className="stats-modal-header">
                    <h2 className="stats-modal-title">{entry.username}</h2>
                    <button className="stats-modal-close" onClick={onClose}>×</button>
                </div>

                <div className="stats-modal-body">
                    <div className="main-stat-badge">
                        <span className="label">Puntos Totales (Semana)</span>
                        <span className={`value ${entry.totalPoints >= 0 ? 'positive' : 'negative'}`}>
                            {Math.floor(entry.totalPoints)} pts
                        </span>
                    </div>

                    <div className="stats-grid">
                        <div className="stat-item">
                            <span className="stat-label">Actividades Positivas</span>
                            <span className="stat-value positive">+{entry.positiveActivities}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Actividades Negativas</span>
                            <span className="stat-value negative">{entry.negativeActivities}</span> {/* No minus sign usually for count */}
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Objetivos Cumplidos</span>
                            <span className="stat-value highlight">{entry.goalsCompleted} 🏆</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Promedio / Actividad</span>
                            <span className="stat-value">{avgPointsPerActivity} pts</span>
                        </div>
                    </div>

                    <div className="recent-activity-section">
                        <h4 className="section-title">Últimas 24hs</h4>
                        <div className="recent-stats-row">
                            <div className="recent-stat">
                                <span className="label">Ganados</span>
                                <span className="value positive">+{Math.floor(entry.pointsLast24hPositive || 0)}</span>
                            </div>
                            <div className="recent-stat">
                                <span className="label">Perdidos</span>
                                <span className="value negative">{Math.floor(entry.pointsLast24hNegative || 0)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
