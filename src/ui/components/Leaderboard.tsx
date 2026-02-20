'use client';

import { useState, useMemo } from 'react';
import Avatar from './Avatar';
import { LEAGUE_THRESHOLDS } from '@/core/types';
import './Leaderboard.css';

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
    isOnVacation?: boolean;
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

const CrownIcon = () => (
    <svg className="crown-icon" width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M2 17L4 7L8 11L12 3L16 11L20 7L22 17H2Z" fill="url(#crownGrad)" stroke="#ffd700" strokeWidth="1.5" strokeLinejoin="round" />
        <defs>
            <linearGradient id="crownGrad" x1="12" y1="3" x2="12" y2="17">
                <stop offset="0%" stopColor="#ffd700" />
                <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
        </defs>
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
    const rest = sortedEntries.slice(3);

    const getLeague = (points: number) => {
        return [...LEAGUE_THRESHOLDS].reverse().find(l => points >= l.minPoints) || LEAGUE_THRESHOLDS[0];
    };

    const getMedalEmoji = (rank: number) => {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return '';
    };

    const getSparklinePath = (userId: string, points: number) => {
        const seed = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const vals = [0.78, 0.85, 0.82, 0.91, 0.88, 0.96, 1].map(v => points * v);
        const max = Math.max(...vals, 1);
        const min = Math.min(...vals, 0);
        const range = max - min || 1;

        return vals.map((p, i) => {
            const x = (i / 6) * 56;
            const y = 18 - ((p - min) / range) * 14;
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ');
    };

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
        const isCurrentUser = currentEntry?.userId === entry.userId;
        const league = getLeague(entry.totalPoints);
        const net24h = (entry.pointsLast24hPositive || 0) + (entry.pointsLast24hNegative || 0);
        // For general view, net24h acts as "last week" net (data comes from the same field)
        const deltaValue = net24h;

        return (
            <div
                key={entry.id}
                className={`lb-row ${isCurrentUser ? 'lb-row--me' : ''}`}
                onClick={() => onRowClick?.(entry)}
                style={{ animationDelay: `${index * 40}ms` }}
            >
                <div className="lb-cell lb-cell--rank">
                    {rank <= 3 ? (
                        <span className={`lb-medal lb-medal--${rank}`}>{getMedalEmoji(rank)}</span>
                    ) : (
                        <span className="lb-rank-num">{rank}</span>
                    )}
                </div>

                <div className="lb-cell lb-cell--user">
                    <div className="lb-avatar-ring" style={{ '--ring-color': league.color } as React.CSSProperties}>
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
                            <span className="lb-username">{entry.username}</span>
                            {entry.isOnVacation && (
                                <span className="lb-badge lb-badge--vacation">🏖 Vacaciones</span>
                            )}
                        </div>
                        <span className="lb-league" style={{ color: league.color }}>
                            {league.icon} {league.tier}
                        </span>
                    </div>
                </div>

                <div className="lb-cell lb-cell--trend">
                    <svg width="56" height="20" className="lb-sparkline">
                        <path d={getSparklinePath(entry.userId, entry.totalPoints)} fill="none" stroke={entry.totalPoints >= 0 ? 'var(--color-positive)' : 'var(--color-negative)'} strokeWidth="1.5" />
                    </svg>
                </div>

                <div className="lb-cell lb-cell--points">
                    <span className={`lb-points ${entry.totalPoints >= 0 ? 'lb-points--pos' : 'lb-points--neg'}`}>
                        {Math.floor(entry.totalPoints).toLocaleString()}
                    </span>
                    <span className="lb-points-label">pts</span>
                </div>

                <div className="lb-cell lb-cell--delta">
                    <span className={`lb-delta ${deltaValue >= 0 ? 'lb-delta--pos' : 'lb-delta--neg'}`}>
                        {deltaValue >= 0 ? '+' : ''}{Math.floor(deltaValue).toLocaleString()}
                    </span>
                </div>
            </div>
        );
    };

    return (
        <div className="lb-container">
            {/* Search Bar */}
            <div className="lb-toolbar">
                <div className="lb-search">
                    <SearchIcon />
                    <input
                        type="text"
                        placeholder="Buscar usuario..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="lb-search-input"
                    />
                    {searchTerm && (
                        <button className="lb-search-clear" onClick={() => setSearchTerm('')}>×</button>
                    )}
                </div>
                {searchTerm && (
                    <span className="lb-search-count">{sortedEntries.length} encontrados</span>
                )}
            </div>

            {/* Podium — only when not searching and have enough entries */}
            {!searchTerm && sortedEntries.length >= 3 && (
                <div className="lb-podium">
                    {[1, 0, 2].map(idx => {
                        const entry = podium[idx];
                        if (!entry) return null;
                        const league = getLeague(entry.totalPoints);
                        const rankLabel = idx + 1;

                        return (
                            <div
                                key={entry.id}
                                className={`lb-podium-card lb-podium-card--${rankLabel}`}
                                onClick={() => onRowClick?.(entry)}
                            >
                                {rankLabel === 1 && <CrownIcon />}
                                <div className="lb-podium-avatar-wrap">
                                    <div className="lb-podium-glow" style={{ background: `radial-gradient(circle, ${league.color}40 0%, transparent 70%)` }} />
                                    <Avatar
                                        src={entry.avatarUrl}
                                        alt={entry.username}
                                        fallback={entry.username}
                                        size="lg"
                                        className={`lb-podium-avatar lb-podium-avatar--${rankLabel}`}
                                        showBorder={false}
                                    />
                                    <div className={`lb-podium-rank lb-podium-rank--${rankLabel}`}>
                                        {getMedalEmoji(rankLabel)} #{rankLabel}
                                    </div>
                                </div>
                                <span className="lb-podium-name">{entry.username}</span>
                                {entry.isOnVacation && (
                                    <span className="lb-badge lb-badge--vacation lb-badge--sm">🏖</span>
                                )}
                                <span className="lb-podium-points" style={{ color: league.color }}>
                                    {Math.floor(entry.totalPoints).toLocaleString()} <small>pts</small>
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Table */}
            <div className="lb-table">
                <div className="lb-table-header">
                    <div className="lb-th lb-th--rank">#</div>
                    <div className="lb-th lb-th--user">Usuario</div>
                    <div className="lb-th lb-th--trend">Tendencia</div>
                    <div className="lb-th lb-th--points">Puntos</div>
                    <div className="lb-th lb-th--delta">{viewMode === 'weekly' ? '24h' : 'Últ. Sem.'}</div>
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
    );
}
