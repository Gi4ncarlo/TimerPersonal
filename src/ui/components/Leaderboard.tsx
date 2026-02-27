'use client';

import { useState, useMemo } from 'react';
import Avatar from './Avatar';
import Twemoji from './Twemoji';
import { LEAGUE_THRESHOLDS } from '@/core/types';
import './Leaderboard.css';

const COSMETIC_AVATAR_MAP: Record<string, string> = {
    crown: '👑',
    bolt: '⚡',
    shield_avatar: '🛡️',
    fire: '🔥',
    star: '⭐',
    skull: '💀',
};

const getCosmeticEmoji = (slug: string): string => COSMETIC_AVATAR_MAP[slug] || slug;

const AVATAR_COLORS = [
    '#6c63ff', '#f5c842', '#22d07a', '#ff4757',
    '#ff9f43', '#b8c5d6', '#c97d3a', '#ffd32a',
];

interface LeaderboardEntry {
    id: string;
    userId: string;
    username: string;
    totalPoints: number;
    positiveActivities: number;
    negativeActivities: number;
    goalsCompleted: number;
    pointsLast24hPositive?: number;
    strikes: number;
    avatarUrl?: string;
    cosmeticAvatar?: string;
    nameColor?: string;
    nameTitle?: string;
    activePowers?: string[];
    isOnVacation?: boolean;
    lastActivity?: string;
    streakDays?: number;
    weekStart: string;
    weekEnd: string;
}

interface LeaderboardProps {
    currentEntry?: LeaderboardEntry;
    entries: LeaderboardEntry[];
    isLoading?: boolean;
    onRowClick?: (entry: LeaderboardEntry) => void;
    title?: string;
    subtitle?: string;
    viewMode?: 'weekly' | 'general';
}

const SearchIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);

export default function Leaderboard({ currentEntry, entries, isLoading, onRowClick, viewMode = 'weekly' }: LeaderboardProps) {
    const [searchTerm, setSearchTerm] = useState('');

    const sortedEntries = useMemo(() => {
        let result = [...entries].sort((a, b) => b.totalPoints - a.totalPoints);
        if (searchTerm) {
            result = result.filter(e => e.username.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        return result;
    }, [entries, searchTerm]);

    const podium = sortedEntries.slice(0, 3);

    const getLeague = (points: number) => {
        return [...LEAGUE_THRESHOLDS].reverse().find(l => points >= l.minPoints) || LEAGUE_THRESHOLDS[0];
    };

    const getMedalEmoji = (rank: number) => {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return '';
    };

    const getAvatarColor = (id: string) => {
        const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return AVATAR_COLORS[hash % AVATAR_COLORS.length];
    };

    const getSparklinePath = (userId: string, points: number) => {
        const seed = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const base = [0.78, 0.85, 0.82, 0.91, 0.88, 0.96, 1];
        const vals = base.map((v, i) => {
            const noise = Math.sin(seed * (i + 1)) * 0.08;
            return points * (v + noise);
        });
        const max = Math.max(...vals, 1);
        const min = Math.min(...vals, 0);
        const range = max - min || 1;

        return vals.map((p, i) => {
            const x = (i / 6) * 64;
            const y = 24 - ((p - min) / range) * 20;
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ');
    };

    const getTrend = (userId: string, points: number): 'up' | 'down' | 'flat' => {
        const seed = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const base = [0.78, 0.85, 0.82, 0.91, 0.88, 0.96, 1];
        const first = points * base[0];
        const last = points * base[base.length - 1];
        const diff = last - first;
        if (diff > points * 0.05) return 'up';
        if (diff < -points * 0.05) return 'down';
        return 'flat';
    };

    const getStreakDays = (entry: LeaderboardEntry) => {
        // Use real streak data from backend if available
        return entry.streakDays ?? 0;
    };

    const getAchievements = (entry: LeaderboardEntry): { emoji: string; title: string }[] => {
        const achs: { emoji: string; title: string }[] = [];
        if (entry.totalPoints >= 1000000) achs.push({ emoji: '💎', title: 'Leyenda (1M+ Sendas)' });
        if (entry.totalPoints >= 500000) achs.push({ emoji: '🏆', title: 'Campeón (500K+ Sendas)' });
        if (entry.totalPoints >= 100000) achs.push({ emoji: '⭐', title: 'Estrella (100K+ Sendas)' });
        if (entry.goalsCompleted >= 10) achs.push({ emoji: '🎯', title: 'Francotirador (10+ Metas)' });
        if (getStreakDays(entry) >= 30) achs.push({ emoji: '🔥', title: 'On Fire (Racha 30d+)' });
        if (entry.strikes === 0) achs.push({ emoji: '🛡️', title: 'Impecable (0 Strikes)' });
        return achs;
    };

    const getLastActivity = (entry: LeaderboardEntry): string => {
        if (!entry.lastActivity) return '—';
        try {
            const date = new Date(entry.lastActivity);
            if (isNaN(date.getTime())) return '—';

            if (viewMode === 'weekly') {
                return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
            } else {
                return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            }
        } catch {
            return '—';
        }
    };

    // ── Summary Stats ──
    const totalUsers = entries.length;
    const avgStreak = totalUsers > 0
        ? Math.round(entries.reduce((sum, e) => sum + getStreakDays(e), 0) / totalUsers)
        : 0;
    const leader = sortedEntries[0];
    const totalStrikes = entries.reduce((sum, e) => sum + e.strikes, 0);

    if (isLoading) {
        return (
            <div className="lb-loading">
                <div className="lb-loading-shimmer" />
                <p className="lb-loading-text">Cargando ranking...</p>
            </div>
        );
    }

    const renderRow = (entry: LeaderboardEntry, index: number) => {
        const rank = index + 1;
        const isMe = currentEntry?.userId === entry.userId;
        const league = getLeague(entry.totalPoints);
        const delta = entry.pointsLast24hPositive || 0;
        const trend = getTrend(entry.userId, entry.totalPoints);
        const trendColor = trend === 'up' ? 'var(--lb-green)' : trend === 'down' ? 'var(--lb-red)' : 'var(--lb-text-muted)';
        const streakDays = getStreakDays(entry);
        const achievements = getAchievements(entry);
        const lastActivityFormatted = getLastActivity(entry);

        return (
            <div
                key={entry.id}
                className={`lb-row ${isMe ? 'lb-row--me' : ''}`}
                onClick={() => onRowClick?.(entry)}
                style={{ animationDelay: `${index * 60}ms` }}
            >
                {/* # */}
                <div className="lb-cell lb-cell--rank">
                    {rank <= 3 ? (
                        <span className="lb-medal"><Twemoji emoji={getMedalEmoji(rank)} /></span>
                    ) : (
                        <span className="lb-rank-num">{rank}</span>
                    )}
                </div>

                {/* Usuario */}
                <div className="lb-cell lb-cell--user">
                    <div className="lb-avatar-ring" style={{ border: `2px solid ${getAvatarColor(entry.userId)}` }}>
                        <Avatar
                            src={entry.avatarUrl}
                            alt={entry.username}
                            fallback={entry.username}
                            size="sm"
                            className="lb-avatar"
                            showBorder={false}
                        />
                    </div>
                    <div className="lb-user-info">
                        <div className="lb-user-top">
                            <span className="lb-username" style={entry.nameColor ? { color: entry.nameColor } : {}}>
                                {entry.username}
                            </span>
                            {isMe && <span className="lb-me-badge">Tú</span>}
                        </div>
                    </div>
                </div>

                {/* Liga */}
                <div className="lb-cell lb-cell--league">
                    <span className="lb-league-pill" style={{
                        color: league.color,
                        background: `${league.color}15`,
                        border: `1px solid ${league.color}25`,
                    }}>
                        <img src={league.imgUrl} alt={league.tier} style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
                        {league.tier}
                    </span>
                </div>

                {/* Racha */}
                <div className="lb-cell lb-cell--streak">
                    <span className={`lb-streak ${streakDays >= 30 ? 'lb-streak--hot' : streakDays >= 10 ? 'lb-streak--warm' : 'lb-streak--cold'}`}>
                        {streakDays >= 10 && <Twemoji emoji="🔥" />}
                        {streakDays}d
                    </span>
                </div>

                {/* Logros */}
                <div className="lb-cell lb-cell--achievements">
                    <div className="lb-achievements">
                        {achievements.slice(0, 3).map((ach, i) => (
                            <span key={i} className="lb-achievement-emoji" title={ach.title}><Twemoji emoji={ach.emoji} /></span>
                        ))}
                        {achievements.length > 3 && (
                            <span className="lb-achievement-more" title={achievements.slice(3).map(a => a.title).join('\n')}>
                                +{achievements.length - 3}
                            </span>
                        )}
                    </div>
                </div>

                {/* Tendencia */}
                <div className="lb-cell lb-cell--trend">
                    <svg width="70" height="28" className="lb-sparkline">
                        <polyline
                            points={getSparklinePath(entry.userId, entry.totalPoints).replace(/[ML]\s*/g, '').split(' ').reduce((acc: string[], val, i, arr) => {
                                if (i % 2 === 0 && i + 1 < arr.length) acc.push(`${val},${arr[i + 1]}`);
                                return acc;
                            }, []).join(' ')}
                            fill="none"
                            stroke={trendColor}
                            strokeWidth="1.8"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                        />
                    </svg>
                </div>

                {/* Sendas */}
                <div className="lb-cell lb-cell--points">
                    <img src="/images/senda-coin-large-sinbg.png" alt="Senda" className="senda-floating-icon senda-floating-icon--sm" />
                    <span className={`lb-points ${entry.totalPoints < 0 ? 'lb-points--neg' : ''}`}>
                        {Math.floor(entry.totalPoints).toLocaleString()}
                    </span>
                </div>

                {/* 24H */}
                <div className="lb-cell lb-cell--delta">
                    <span className={`lb-delta ${delta > 0 ? 'lb-delta--pos' : delta < 0 ? 'lb-delta--neg' : 'lb-delta--zero'}`}>
                        {delta > 0 ? `+${Math.floor(delta).toLocaleString()}` : delta < 0 ? Math.floor(delta).toLocaleString() : '—'}
                    </span>
                </div>

                {/* Última Carga */}
                <div className="lb-cell lb-cell--access">
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.75rem', color: 'var(--lb-text-muted)' }}>
                        {lastActivityFormatted}
                    </span>
                </div>

                {/* Strikes */}
                <div className="lb-cell lb-cell--strikes">
                    {entry.strikes === 0 ? (
                        <span className="lb-strike-badge lb-strike-badge--0">—</span>
                    ) : (
                        <span
                            className={`lb-strike-badge lb-strike-badge--${Math.min(entry.strikes, 5)}`}
                            title={`${entry.strikes} strike${entry.strikes > 1 ? 's' : ''}`}
                        >
                            <Twemoji emoji="🔥" /> {entry.strikes}
                        </span>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="lb-container">
            {/* Summary Strip */}
            <div className="lb-summary-strip">
                <div className="lb-summary-card">
                    <span className="lb-summary-label">Usuarios Activos</span>
                    <span className="lb-summary-value" style={{ color: 'var(--lb-text)' }}>{totalUsers}</span>
                </div>
                <div className="lb-summary-card">
                    <span className="lb-summary-label">Racha Promedio</span>
                    <span className="lb-summary-value" style={{ color: 'var(--lb-gold)' }}>{avgStreak}d</span>
                </div>
                <div className="lb-summary-card">
                    <span className="lb-summary-label">Líder Actual</span>
                    <span className="lb-summary-value" style={{ color: 'var(--lb-green)' }}>{leader?.username || '—'}</span>
                </div>
                <div className="lb-summary-card">
                    <span className="lb-summary-label">Strikes Activos</span>
                    <span className="lb-summary-value" style={{ color: 'var(--lb-red)' }}>{totalStrikes}</span>
                </div>
            </div>

            {/* Podium */}
            {!searchTerm && sortedEntries.length >= 3 && (
                <div className="lb-podium">
                    {[1, 0, 2].map(idx => {
                        const entry = podium[idx];
                        if (!entry) return null;
                        const league = getLeague(entry.totalPoints);
                        const rankLabel = idx + 1;
                        const streakDays = getStreakDays(entry);
                        const achievements = getAchievements(entry);
                        const delta = entry.pointsLast24hPositive || 0;
                        const rankColor = rankLabel === 1 ? 'var(--lb-gold)' : rankLabel === 2 ? 'var(--lb-silver)' : 'var(--lb-bronze)';

                        return (
                            <div
                                key={entry.id}
                                className={`lb-podium-card lb-podium-card--${rankLabel}`}
                                onClick={() => onRowClick?.(entry)}
                            >
                                <span className={`lb-podium-rank-badge lb-podium-rank-badge--${rankLabel}`}>{rankLabel}</span>

                                <div className="lb-podium-avatar-wrap">
                                    {rankLabel === 1 && (
                                        <>
                                            <div className="lb-podium-glow" style={{ background: `radial-gradient(circle, ${league.color}40 0%, transparent 70%)` }} />
                                            <span className="lb-podium-crown"><Twemoji emoji="👑" /></span>
                                        </>
                                    )}
                                    <Avatar
                                        src={entry.avatarUrl}
                                        alt={entry.username}
                                        fallback={entry.username}
                                        size="lg"
                                        className={`lb-podium-avatar lb-podium-avatar--${rankLabel}`}
                                        showBorder={false}
                                    />
                                </div>

                                <span className="lb-podium-name">{entry.username}</span>

                                <span className="lb-podium-league" style={{
                                    color: league.color,
                                    background: `${league.color}15`,
                                    border: `1px solid ${league.color}25`,
                                }}>
                                    {league.tier}
                                </span>

                                <span className="lb-podium-score" style={{ color: rankColor }}>
                                    <img src="/images/senda-coin-large-sinbg.png" alt="Senda" className="senda-floating-icon senda-floating-icon--sm" />
                                    {Math.floor(entry.totalPoints).toLocaleString()}
                                </span>

                                <div className="lb-podium-mini-stats">
                                    <span className="lb-podium-mini-stat">
                                        <Twemoji emoji="🔥" /> {streakDays}
                                    </span>
                                    <span className="lb-podium-mini-stat">
                                        {achievements.slice(0, 2).map((a, i) => <span key={i} title={a.title}><Twemoji emoji={a.emoji} /></span>)}
                                    </span>
                                    <span className="lb-podium-mini-stat" style={{ color: delta >= 0 ? 'var(--lb-green)' : 'var(--lb-red)' }}>
                                        Δ {delta >= 0 ? '+' : ''}{Math.floor(delta).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Search */}
            <div className="lb-search-bar">
                <SearchIcon />
                <input
                    type="text"
                    placeholder="Buscar usuario..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="lb-search-input"
                />
            </div>

            {/* Table */}
            <div className="lb-table-container margin-top-lg">
                {totalStrikes > 0 && viewMode === 'general' && (
                    <div className="lb-shame-banner-wrapper">
                        <img
                            src="/images/stryke_shame_banner.png"
                            alt="Zona de Strykes"
                            className="lb-shame-banner-img"
                        />
                        <div className="lb-shame-banner-overlay">
                            <span className="lb-shame-icon">⚠️</span>
                            <h3>ZONA DE STRYKES</h3>
                            <p>Jugadores con penalizaciones activas. ¡Cuidá tu honor!</p>
                        </div>
                    </div>
                )}
                <div className="lb-table">
                    <div className="lb-table-header">
                        <div className="lb-th lb-th--center">#</div>
                        <div className="lb-th">Usuario</div>
                        <div className="lb-th lb-th--league">Liga</div>
                        <div className="lb-th lb-th--streak">Racha</div>
                        <div className="lb-th lb-th--achievements">Logros</div>
                        <div className="lb-th lb-th--center lb-th--trend">Trend</div>
                        <div className="lb-th lb-th--points">Sendas</div>
                        <div className="lb-th lb-th--right lb-th--delta">{viewMode === 'weekly' ? '24H' : 'Últ. Sem.'}</div>
                        <div className="lb-th lb-th--access">Última Carga</div>
                        <div className="lb-th lb-th--center lb-th--strikes">Strikes</div>
                    </div>

                    <div className="lb-table-body">
                        {sortedEntries.map((entry, index) => renderRow(entry, index))}
                        {sortedEntries.length === 0 && (
                            <div className="lb-empty">
                                <p>No se encontraron usuarios</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
