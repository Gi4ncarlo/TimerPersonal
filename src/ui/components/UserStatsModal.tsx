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
    avatarUrl?: string;
    weekStart: string;
    weekEnd: string;
}

interface UserStatsModalProps {
    entry: LeaderboardEntry;
    isOpen: boolean;
    onClose: () => void;
    viewMode?: 'weekly' | 'general';
}

export default function UserStatsModal({ entry, isOpen, onClose, viewMode = 'general' }: UserStatsModalProps) {
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

    // Context-aware metrics based on viewMode
    const isWeekly = viewMode === 'weekly';

    const metrics = isWeekly
        ? [
            {
                label: 'Productividad',
                value: Math.min(100, (entry.positiveActivities / 30) * 100),
                desc: 'Actividades positivas esta semana'
            },
            {
                label: 'Disciplina',
                value: Math.max(0, 100 - (entry.strikes * 25)),
                desc: 'Penalización por strikes esta semana'
            },
            {
                label: 'Objetivos',
                value: Math.min(100, (entry.goalsCompleted / 5) * 100),
                desc: 'Metas completadas esta semana'
            },
            {
                label: 'Balance',
                value: Math.min(100, Math.max(0, ((entry.totalPoints + 5000) / 10000) * 100)),
                desc: 'Balance neto semanal'
            },
        ]
        : [
            {
                label: 'Producción',
                value: Math.min(100, (entry.positiveActivities / 50) * 100),
                desc: 'Volumen total de actividades positivas'
            },
            {
                label: 'Disciplina',
                value: Math.max(0, 100 - (entry.strikes * 20)),
                desc: 'Resistencia a las faltas acumuladas'
            },
            {
                label: 'Enfoque',
                value: Math.min(100, (entry.goalsCompleted / 10) * 100),
                desc: 'Tasa de cumplimiento de objetivos'
            },
            {
                label: 'Poder',
                value: Math.min(100, (Math.abs(entry.totalPoints) / 50000) * 100),
                desc: 'Balance total acumulado'
            },
        ];

    const net24h = (entry.pointsLast24hPositive || 0) + (entry.pointsLast24hNegative || 0);

    return (
        <div className="usm-overlay">
            <div className="usm-content" ref={modalRef}>
                {/* Header */}
                <div className="usm-header" style={{ '--accent': league.color } as React.CSSProperties}>
                    <div className="usm-header-info">
                        <h2 className="usm-name">{entry.username}</h2>
                        <span className="usm-league" style={{ color: league.color, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <img src={league.imgUrl} alt={league.tier} style={{ width: '24px', height: '24px', objectFit: 'contain' }} className="badge-premium" /> Liga {league.tier}
                        </span>
                        <span className="usm-view-label">
                            {isWeekly ? 'Resumen Semanal' : 'Estadísticas Generales'}
                        </span>
                    </div>
                    <button className="usm-close" onClick={onClose}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <div className="usm-body">
                    {/* Radar Chart */}
                    <div className="usm-radar-wrap">
                        <svg width="260" height="260" viewBox="0 0 240 240" className="usm-radar-svg">
                            <defs>
                                <radialGradient id="radarFill" cx="50%" cy="50%" r="50%">
                                    <stop offset="0%" stopColor={league.color} stopOpacity="0.35" />
                                    <stop offset="100%" stopColor={league.color} stopOpacity="0.05" />
                                </radialGradient>
                            </defs>

                            {/* Grid */}
                            {[80, 60, 40, 20].map(r => (
                                <circle key={r} cx="120" cy="120" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
                            ))}

                            {/* Axes */}
                            {metrics.map((_, i) => {
                                const angle = (i * 2 * Math.PI) / metrics.length - Math.PI / 2;
                                return <line key={i} x1="120" y1="120" x2={120 + 80 * Math.cos(angle)} y2={120 + 80 * Math.sin(angle)} stroke="rgba(255,255,255,0.1)" strokeDasharray="3,3" />;
                            })}

                            {/* Shape */}
                            <polygon
                                points={metrics.map((m, i) => {
                                    const angle = (i * 2 * Math.PI) / metrics.length - Math.PI / 2;
                                    const x = 120 + (80 * (m.value / 100)) * Math.cos(angle);
                                    const y = 120 + (80 * (m.value / 100)) * Math.sin(angle);
                                    return `${x},${y}`;
                                }).join(' ')}
                                fill="url(#radarFill)"
                                stroke={league.color}
                                strokeWidth="2.5"
                                className="usm-radar-shape"
                            />

                            {/* Labels */}
                            {metrics.map((m, i) => {
                                const angle = (i * 2 * Math.PI) / metrics.length - Math.PI / 2;
                                const x = 120 + 102 * Math.cos(angle);
                                const y = 120 + 102 * Math.sin(angle);
                                type TextAnchor = "middle" | "start" | "end";
                                let textAnchor: TextAnchor = "middle";
                                if (Math.cos(angle) > 0.1) textAnchor = "start";
                                if (Math.cos(angle) < -0.1) textAnchor = "end";

                                return (
                                    <g key={i}>
                                        <text x={x} y={y} textAnchor={textAnchor} dominantBaseline="middle" className="usm-radar-label">
                                            {m.label}
                                        </text>
                                        <title>{m.desc}</title>
                                    </g>
                                );
                            })}
                        </svg>
                    </div>

                    {/* Stats Grid — context-aware */}
                    {isWeekly ? (
                        <>
                            <div className="usm-stats-grid usm-stats-grid--4">
                                <div className="usm-stat-card">
                                    <span className="usm-stat-label">Sendas</span>
                                    <span className={`usm-stat-value ${entry.totalPoints >= 0 ? 'usm-stat--pos' : 'usm-stat--neg'}`}>
                                        <img src="/images/senda-coin-large-sinbg.png" alt="Senda" className="senda-floating-icon senda-floating-icon--sm" />
                                        {Math.floor(entry.totalPoints).toLocaleString()}
                                    </span>
                                </div>
                                <div className="usm-stat-card">
                                    <span className="usm-stat-label">Neto 24h</span>
                                    <span className={`usm-stat-value ${net24h >= 0 ? 'usm-stat--pos' : 'usm-stat--neg'}`}>
                                        {net24h >= 0 ? '+' : ''}{Math.floor(net24h).toLocaleString()}
                                    </span>
                                </div>
                                <div className="usm-stat-card">
                                    <span className="usm-stat-label">Metas</span>
                                    <span className="usm-stat-value usm-stat--highlight">{entry.goalsCompleted}</span>
                                </div>
                                <div className="usm-stat-card">
                                    <span className="usm-stat-label">Faltas</span>
                                    <span className={`usm-stat-value ${entry.strikes > 0 ? 'usm-stat--neg' : 'usm-stat--muted'}`}>
                                        {entry.strikes}
                                    </span>
                                </div>
                            </div>

                            {/* Activity breakdown — weekly specific */}
                            <div className="usm-activity-bar">
                                <div className="usm-activity-header">
                                    <span className="usm-activity-title">Actividades</span>
                                    <span className="usm-activity-total">{entry.positiveActivities + entry.negativeActivities} total</span>
                                </div>
                                <div className="usm-bar-track">
                                    <div
                                        className="usm-bar-fill usm-bar-fill--pos"
                                        style={{
                                            width: `${entry.positiveActivities + entry.negativeActivities > 0
                                                ? (entry.positiveActivities / (entry.positiveActivities + entry.negativeActivities)) * 100
                                                : 50}%`
                                        }}
                                    />
                                </div>
                                <div className="usm-bar-legend">
                                    <div className="usm-bar-legend-item">
                                        <span className="usm-dot usm-dot--pos" />
                                        <span>{entry.positiveActivities} positivas</span>
                                    </div>
                                    <div className="usm-bar-legend-item">
                                        <span className="usm-dot usm-dot--neg" />
                                        <span>{entry.negativeActivities} negativas</span>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="usm-stats-grid usm-stats-grid--3">
                                <div className="usm-stat-card">
                                    <span className="usm-stat-label">Sendas totales</span>
                                    <span className={`usm-stat-value ${entry.totalPoints >= 0 ? 'usm-stat--pos' : 'usm-stat--neg'}`}>
                                        <img src="/images/senda-coin-large-sinbg.png" alt="Senda" className="senda-floating-icon senda-floating-icon--sm" />
                                        {Math.floor(entry.totalPoints).toLocaleString()}
                                    </span>
                                </div>
                                <div className="usm-stat-card">
                                    <span className="usm-stat-label">Objetivos</span>
                                    <span className="usm-stat-value usm-stat--highlight">{entry.goalsCompleted}</span>
                                </div>
                                <div className="usm-stat-card">
                                    <span className="usm-stat-label">Faltas</span>
                                    <span className={`usm-stat-value ${entry.strikes > 0 ? 'usm-stat--neg' : 'usm-stat--muted'}`}>
                                        {entry.strikes}
                                    </span>
                                </div>
                            </div>

                            {/* Activity breakdown — general */}
                            <div className="usm-activity-bar">
                                <div className="usm-activity-header">
                                    <span className="usm-activity-title">Balance de actividades</span>
                                    <span className="usm-activity-total">{entry.positiveActivities + entry.negativeActivities} total</span>
                                </div>
                                <div className="usm-bar-track">
                                    <div
                                        className="usm-bar-fill usm-bar-fill--pos"
                                        style={{
                                            width: `${entry.positiveActivities + entry.negativeActivities > 0
                                                ? (entry.positiveActivities / (entry.positiveActivities + entry.negativeActivities)) * 100
                                                : 50}%`
                                        }}
                                    />
                                </div>
                                <div className="usm-bar-legend">
                                    <div className="usm-bar-legend-item">
                                        <span className="usm-dot usm-dot--pos" />
                                        <span>{entry.positiveActivities} positivas</span>
                                    </div>
                                    <div className="usm-bar-legend-item">
                                        <span className="usm-dot usm-dot--neg" />
                                        <span>{entry.negativeActivities} negativas</span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="usm-footer">
                        {isWeekly
                            ? `Semana: ${entry.weekStart} — ${entry.weekEnd}`
                            : 'Estadísticas acumuladas de todos los tiempos'}
                    </div>
                </div>
            </div>
        </div>
    );
}
