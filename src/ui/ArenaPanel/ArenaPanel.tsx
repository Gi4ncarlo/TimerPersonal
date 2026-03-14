import React, { useState, useEffect } from 'react';
import styles from './ArenaPanel.module.css';
import { DailyMission, Tournament, User, TournamentParticipant } from '@/core/types';

interface ArenaPanelProps {
    missions: DailyMission[];
    activeTournament?: Tournament | null;
    tournamentParticipants?: TournamentParticipant[];
    currentUser?: User | null;
    currentStreak: number;
    dailyFlameCount: number;
    dailyRerollsUsed?: number;
    rerollingMissionId?: string | null;
    onRerollMission?: (missionId: string) => void;
    onMissionClick?: (mission: DailyMission) => void;
}

export default function ArenaPanel({
    missions,
    activeTournament,
    tournamentParticipants = [],
    currentUser,
    currentStreak,
    dailyFlameCount,
    dailyRerollsUsed = 0,
    rerollingMissionId,
    onRerollMission,
    onMissionClick
}: ArenaPanelProps) {
    const [activeTab, setActiveTab] = useState<'missions' | 'tournament'>('missions');
    const [timeLeft, setTimeLeft] = useState('');

    const completedMissionsCount = missions.filter(m => m.status === 'completed').length;
    const totalMissionsCount = missions.length;

    useEffect(() => {
        if (!activeTournament) return;

        const updateTimer = () => {
            const endDate = new Date(activeTournament.weekEnd + 'T23:59:59');
            const now = new Date();
            const diff = endDate.getTime() - now.getTime();

            if (diff <= 0) {
                setTimeLeft('Finalizado');
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            let timeStr = '';
            if (days > 0) timeStr += `${days}d `;
            timeStr += `${hours}h ${minutes}m`;
            setTimeLeft(timeStr);
        };

        updateTimer();
        const intervalId = setInterval(updateTimer, 60000); // Actualiza cada minuto

        return () => clearInterval(intervalId);
    }, [activeTournament]);


    // Helper for mission styling based on category
    const getMissionStyles = (category: string) => {
        switch (category) {
            case 'productivity':
            case 'career':
                return { color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)', border: 'rgba(251, 191, 36, 0.3)' };
            case 'health':
            case 'fitness':
                return { color: '#4ade80', bg: 'rgba(74, 222, 128, 0.15)', border: 'rgba(74, 222, 128, 0.3)' };
            case 'mind':
            case 'learning':
                return { color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.15)', border: 'rgba(96, 165, 250, 0.3)' };
            case 'social':
                return { color: '#f472b6', bg: 'rgba(244, 114, 182, 0.15)', border: 'rgba(244, 114, 182, 0.3)' };
            default:
                return { color: '#a78bfa', bg: 'rgba(139, 92, 246, 0.15)', border: 'rgba(139, 92, 246, 0.3)' };
        }
    };

    const getMissionIcon = (category: string) => {
        switch (category) {
            case 'productivity': return '⚡';
            case 'health': return '🏋️';
            case 'mind': return '🧠';
            case 'social': return '🤝';
            default: return '🎯';
        }
    };

    // Calculate max score for leaderboard mini-bars
    const maxScore = tournamentParticipants.length > 0 ? tournamentParticipants[0].score : 1;

    return (
        <div className={styles.arenaContainer}>
            {/* HEADER & TABS */}
            <header className={styles.arenaHeader}>
                <div className={styles.tabsContainer}>
                    <button 
                        className={`${styles.tabButton} ${activeTab === 'missions' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('missions')}
                    >
                        Misiones
                    </button>
                    <button 
                        className={`${styles.tabButton} ${activeTab === 'tournament' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('tournament')}
                    >
                        Torneo
                    </button>
                </div>

                <div className={styles.headerMetadata}>
                    {activeTab === 'missions' ? (
                        <>
                            <span className={styles.difficultyBadge}>Diarias</span>
                            <span className={styles.flamePill}>🔥 {dailyFlameCount}</span>
                        </>
                    ) : (
                        activeTournament && (
                            <span className={styles.topicBadge}>{activeTournament.category}</span>
                        )
                    )}
                </div>
            </header>

            {/* CONTENT PANELS */}
            <div className={styles.panelContainer}>
                
                {/* MISSIONS PANEL */}
                <div className={`${styles.panelContent} ${activeTab === 'missions' ? styles.visible : ''}`}>
                    <div className={styles.missionsList}>
                        {missions.length === 0 ? (
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', textAlign: 'center', margin: '20px 0' }}>
                                No hay misiones asignadas hoy.
                            </p>
                        ) : (
                            missions.map(mission => {
                                const mStyles = getMissionStyles(mission.missionType);
                                const progressPct = Math.min(100, Math.round((mission.currentValue / mission.targetValue) * 100));
                                
                                return (
                                    <div 
                                        key={mission.id} 
                                        className={styles.missionItem}
                                        onClick={() => onMissionClick && onMissionClick(mission)}
                                        style={{ cursor: onMissionClick ? 'pointer' : 'default' }}
                                    >
                                        {/* Tooltip on Hover */}
                                        {mission.description && (
                                            <div className={styles.missionTooltip}>
                                                {mission.description}
                                            </div>
                                        )}
                                        {/* Icon */}
                                        <div className={styles.missionIcon} style={{ background: mStyles.bg, color: mStyles.color, borderColor: mStyles.border }}>
                                            {mission.status === 'completed' ? '✓' : getMissionIcon(mission.missionType)}
                                        </div>

                                        {/* Center: Title + Progress Bar */}
                                        <div className={styles.missionCenter}>
                                            <h4 className={styles.missionName}>{mission.title}</h4>
                                            <div className={styles.progressBarContainer}>
                                                <div 
                                                    className={styles.progressBarFill} 
                                                    style={{ width: `${progressPct}%`, background: `linear-gradient(90deg, ${mStyles.color}80, ${mStyles.color})` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Right: Points + Progress Text */}
                                        <div className={styles.missionRight}>
                                            <div className={styles.missionPoints}>
                                                <div className={styles.pointDot} style={{ background: mStyles.color }} />
                                                +{mission.rewardPoints}
                                            </div>
                                            <span className={styles.missionProgressText}>
                                                {mission.currentValue}/{mission.targetValue} {mission.actionId?.includes('dur') ? 'm' : ''}
                                            </span>
                                        </div>

                                        {/* Action: Reroll Button (only if not completed) */}
                                        {mission.status !== 'completed' ? (
                                            <button 
                                                className={styles.rerollButton} 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if(onRerollMission) onRerollMission(mission.id);
                                                }}
                                                disabled={dailyRerollsUsed >= 2 || rerollingMissionId === mission.id}
                                                title="Cambiar misión"
                                            >
                                                {rerollingMissionId === mission.id ? (
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.spinIcon}>
                                                        <line x1="12" y1="2" x2="12" y2="6"></line>
                                                        <line x1="12" y1="18" x2="12" y2="22"></line>
                                                        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                                                        <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                                                        <line x1="2" y1="12" x2="6" y2="12"></line>
                                                        <line x1="18" y1="12" x2="22" y2="12"></line>
                                                        <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                                                        <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                                                    </svg>
                                                ) : (
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="23 4 23 10 17 10"></polyline>
                                                        <polyline points="1 20 1 14 7 14"></polyline>
                                                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                                                    </svg>
                                                )}
                                            </button>
                                        ) : (
                                            <div style={{ width: 28 }} /> /* spacer to keep grid alive */
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className={styles.missionsFooter}>
                        <span className={styles.rerollPill}>
                            {2 - dailyRerollsUsed} Cambios disp.
                        </span>
                        <span className={styles.completedText}>
                            {completedMissionsCount} de {totalMissionsCount} completadas
                        </span>
                    </div>
                </div>

                {/* TOURNAMENT PANEL */}
                <div className={`${styles.panelContent} ${activeTab === 'tournament' ? styles.visible : ''}`}>
                    {activeTournament ? (
                        <>
                            <div className={styles.tournamentHeader}>
                                <div>
                                    <h3 className={styles.tournamentTitle}>{activeTournament.emoji} {activeTournament.title}</h3>
                                    <p className={styles.tournamentDescription}>{activeTournament.description}</p>
                                </div>
                                <div className={styles.liveTimer}>
                                    <div className={styles.pulseDot} />
                                    {timeLeft}
                                </div>
                            </div>

                            <div className={styles.leaderboard}>
                                {tournamentParticipants.length === 0 ? (
                                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>Aún no hay participantes clasificados.</p>
                                ) : (
                                    // Take top 5 for compact view
                                    tournamentParticipants.slice(0, 5).map((p, index) => {
                                        const isCurrent = currentUser?.id === p.userId;
                                        const isRank1 = index === 0;
                                        const barWidth = Math.max(2, (p.score / maxScore) * 100);

                                        return (
                                            <div 
                                                key={p.userId} 
                                                className={`${styles.leaderboardRow} ${isCurrent ? styles.isCurrentUser : ''} ${isRank1 ? styles.rank1 : ''}`}
                                            >
                                                <div className={`${styles.rankNumber} ${isRank1 ? styles.rank1 : ''}`}>
                                                    #{index + 1}
                                                </div>
                                                <div className={styles.avatar}>
                                                    {p.username ? p.username.charAt(0).toUpperCase() : '?'}
                                                </div>
                                                <div className={styles.userName}>
                                                    {p.username || 'Usuario'}
                                                    {isCurrent && <span className={styles.youTag}>(tú)</span>}
                                                </div>
                                                <div className={styles.scoreSection}>
                                                    <span className={styles.scoreValue}>{p.score.toLocaleString('es-AR')}</span>
                                                    <div className={styles.miniBarContainer}>
                                                        <div className={styles.miniBarFill} style={{ width: `${barWidth}%` }} />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {activeTournament.rewardMultiplier > 1 && (
                                <div className={styles.prizePill}>
                                    <div className={styles.prizeLabel}>
                                        PREMIO <span>Multiplicador x{activeTournament.rewardMultiplier}</span>
                                    </div>
                                    <button className={styles.prizeButton}>Torneo Abierto →</button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px' }}>
                            <span style={{ fontSize: '32px', opacity: 0.5 }}>🏆</span>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>No hay torneo activo en este momento.</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
