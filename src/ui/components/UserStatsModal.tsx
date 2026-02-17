import { useRef, useEffect } from 'react';
import { LEAGUE_THRESHOLDS } from '@/core/types';
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
    strikes: number;
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

    const getLeague = (points: number) => {
        return [...LEAGUE_THRESHOLDS].reverse().find(l => points >= l.minPoints) || LEAGUE_THRESHOLDS[0];
    };

    const league = getLeague(entry.totalPoints);

    // RADAR CHART DATA (Refined SVG Radar)
    const metrics = [
        {
            label: 'Producción',
            value: Math.min(100, (entry.positiveActivities / 50) * 100),
            desc: 'Basado en el volumen de actividades positivas realizadas.'
        },
        {
            label: 'Disciplina',
            value: Math.max(0, 100 - (entry.strikes * 20)),
            desc: 'Resistencia a las faltas. Baja con cada Strike recibido.'
        },
        {
            label: 'Enfoque',
            value: Math.min(100, (entry.goalsCompleted / 10) * 100),
            desc: 'Tasa de cumplimiento de objetivos semanales.'
        },
        {
            label: 'Poder',
            value: Math.min(100, (Math.abs(entry.totalPoints) / 50000) * 100),
            desc: 'Balance total acumulado en el tiempo.'
        },
    ];

    const generateRadarPoints = () => {
        const center = 100;
        const radius = 80;
        return metrics.map((m, i) => {
            const angle = (i * 2 * Math.PI) / metrics.length - Math.PI / 2;
            const x = center + (radius * (m.value / 100)) * Math.cos(angle);
            const y = center + (radius * (m.value / 100)) * Math.sin(angle);
            return `${x},${y}`;
        }).join(' ');
    };

    return (
        <div className="stats-modal-overlay">
            <div className="stats-modal-content" ref={modalRef}>
                <div className="stats-modal-header" style={{ borderBottomColor: league.color }}>
                    <div className="header-user-info">
                        <h2 className="stats-modal-title">{entry.username}</h2>
                        <span className="modal-league-tag" style={{ color: league.color }}>
                            {league.icon} Liga {league.tier}
                        </span>
                    </div>
                    <button className="stats-modal-close" onClick={onClose}>×</button>
                </div>

                <div className="stats-modal-body">
                    <div className="radar-container">
                        <svg width="280" height="280" viewBox="0 0 240 240" className="radar-svg">
                            <defs>
                                <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                                    <stop offset="0%" stopColor={league.color} stopOpacity="0.4" />
                                    <stop offset="100%" stopColor={league.color} stopOpacity="0" />
                                </radialGradient>
                            </defs>

                            {/* Grid circles */}
                            <circle cx="120" cy="120" r="80" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
                            <circle cx="120" cy="120" r="60" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                            <circle cx="120" cy="120" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                            <circle cx="120" cy="120" r="20" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />

                            {/* Axes */}
                            {metrics.map((_, i) => {
                                const angle = (i * 2 * Math.PI) / metrics.length - Math.PI / 2;
                                return <line key={i} x1="120" y1="120" x2={120 + 80 * Math.cos(angle)} y2={120 + 80 * Math.sin(angle)} stroke="rgba(255,255,255,0.2)" strokeDasharray="4,4" />;
                            })}

                            {/* Shape */}
                            <polygon
                                points={metrics.map((m, i) => {
                                    const angle = (i * 2 * Math.PI) / metrics.length - Math.PI / 2;
                                    const x = 120 + (80 * (m.value / 100)) * Math.cos(angle);
                                    const y = 120 + (80 * (m.value / 100)) * Math.sin(angle);
                                    return `${x},${y}`;
                                }).join(' ')}
                                fill="url(#radarGlow)"
                                stroke={league.color}
                                strokeWidth="3"
                                className="radar-polygon"
                            />

                            {/* Interactive Labels */}
                            {metrics.map((m, i) => {
                                const angle = (i * 2 * Math.PI) / metrics.length - Math.PI / 2;
                                const x = 120 + 105 * Math.cos(angle);
                                const y = 120 + 105 * Math.sin(angle);

                                // Adjust text anchor based on position
                                type TextAnchor = "inherit" | "middle" | "start" | "end";
                                let textAnchor: TextAnchor = "middle";
                                if (Math.cos(angle) > 0.1) textAnchor = "start";
                                if (Math.cos(angle) < -0.1) textAnchor = "end";

                                return (
                                    <g key={i} className="radar-label-group">
                                        <text
                                            x={x}
                                            y={y}
                                            textAnchor={textAnchor}
                                            className="radar-text"
                                            dominantBaseline="middle"
                                        >
                                            {m.label}
                                        </text>
                                        <title>{m.desc}</title>
                                        {/* Larger hover target area */}
                                        <circle cx={x} cy={y} r="25" fill="transparent" className="radar-hover-target" />
                                    </g>
                                );
                            })}
                        </svg>
                    </div>

                    <div className="stats-summary-grid">
                        <div className="summary-card">
                            <span className="sc-label">PUNTOS</span>
                            <span className={`sc-value ${entry.totalPoints >= 0 ? 'positive' : 'negative'}`}>{Math.floor(entry.totalPoints).toLocaleString()}</span>
                        </div>
                        <div className="summary-card">
                            <span className="sc-label">OBJETIVOS</span>
                            <span className="sc-value highlight">{entry.goalsCompleted}</span>
                        </div>
                        <div className="summary-card">
                            <span className="sc-label">FALTAS</span>
                            <span className="sc-value negative">{entry.strikes}</span>
                        </div>
                    </div>

                    <div className="modal-footer-info">
                        Vencimiento de rango: Domingo 23:59hs
                    </div>
                </div>
            </div>
        </div>
    );
}
