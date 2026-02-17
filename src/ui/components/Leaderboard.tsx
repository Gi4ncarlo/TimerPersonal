'use client';

import { useState, useEffect, useMemo } from 'react';
import Twemoji from './Twemoji';
import { LEAGUE_THRESHOLDS, LeagueTier } from '@/core/types';
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
    weekStart: string;
    weekEnd: string;
}

interface LeaderboardProps {
    currentEntry?: LeaderboardEntry;
    entries: LeaderboardEntry[];
    isLoading?: boolean;
    onRowClick?: (entry: LeaderboardEntry) => void;
}

interface LeaderboardProps {
    currentEntry?: LeaderboardEntry;
    entries: LeaderboardEntry[];
    isLoading?: boolean;
    onRowClick?: (entry: LeaderboardEntry) => void;
    title?: string;
    subtitle?: string;
}

export default function Leaderboard({ currentEntry, entries, isLoading, onRowClick, title, subtitle }: LeaderboardProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [pinnedUserId, setPinnedUserId] = useState<string | null>(null);

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

    const getRankTheme = (rank: number) => {
        switch (rank) {
            case 1: return { label: 'CAMPEÓN', class: 'first' };
            case 2: return { label: 'SUB-COMANDANTE', class: 'second' };
            case 3: return { label: 'ÉLITE GALÁCTICA', class: 'third' };
            default: return { label: `RANGO ${rank}`, class: '' };
        }
    };

    const getInsignias = (entry: LeaderboardEntry) => {
        const badges = [];
        if (entry.strikes === 0 && entry.totalPoints > 5000) badges.push({ icon: '🛡️', label: 'Impecable', color: '#00d4ff' });
        if (entry.positiveActivities > 40) badges.push({ icon: '🔥', label: 'En Racha', color: '#ff4d4d' });
        if (entry.goalsCompleted > 5) badges.push({ icon: '🎯', label: 'Francotirador', color: '#00ff88' });
        return badges;
    };

    // Simple deterministic sparkline path based on user points history (simulated for visual effect)
    const getSparklinePath = (userId: string, points: number) => {
        const seed = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const pointsArray = [points * 0.8, points * 0.9, points * 0.85, points * 0.95, points * 1, points * 0.92, points];
        const max = Math.max(...pointsArray, 1);
        const min = Math.min(...pointsArray, 0);
        const range = max - min;

        return pointsArray.map((p, i) => {
            const x = (i / 6) * 60;
            const y = 20 - ((p - min) / range) * 15;
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ');
    };

    if (isLoading) {
        return (
            <div className="leaderboard-container">
                <div className="loading-state">
                    <div className="scanner-line"></div>
                    <p className="loading-text">ACCEDIENDO A LOS ARCHIVOS DEL COMANDO...</p>
                </div>
            </div>
        );
    }

    const renderRow = (entry: LeaderboardEntry, index: number) => {
        const rank = index + 1;
        const isCurrentUser = currentEntry?.userId === entry.userId;
        const isPinned = pinnedUserId === entry.userId;
        const league = getLeague(entry.totalPoints);
        const insignias = getInsignias(entry);
        const net24h = (entry.pointsLast24hPositive || 0) + (entry.pointsLast24hNegative || 0);

        return (
            <div
                key={entry.id}
                className={`leaderboard-row ${isCurrentUser ? 'current-user' : ''} ${isPinned ? 'pinned-row' : ''}`}
                onClick={() => onRowClick && onRowClick(entry)}
            >
                <div className="rank-col">
                    <span className="rank-number">{rank}</span>
                    <button
                        className={`pin-btn ${isPinned ? 'active' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            setPinnedUserId(isPinned ? null : entry.userId);
                        }}
                    >
                        📌
                    </button>
                </div>

                <div className="username-col">
                    <div className="avatar-info-group">
                        <div className="avatar-ring" style={{ borderColor: league.color }}>
                            {entry.avatarUrl ? (
                                <img src={entry.avatarUrl} alt="" className="user-avatar-small" />
                            ) : (
                                <div className="avatar-placeholder-small">{entry.username.charAt(0).toUpperCase()}</div>
                            )}
                        </div>
                        <div className="user-info-stack">
                            <div className="username-row">
                                <span className="username-text">{entry.username}</span>
                                <div className="insignia-belt">
                                    {insignias.map((b, i) => (
                                        <span key={i} className="insignia-icon" title={b.label} style={{ color: b.color }}>{b.icon}</span>
                                    ))}
                                </div>
                            </div>
                            <span className="league-text" style={{ color: league.color }}>
                                {league.icon} {league.tier}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="sparkline-col">
                    <svg width="60" height="20" className="sparkline-svg">
                        <path d={getSparklinePath(entry.userId, entry.totalPoints)} fill="none" stroke={entry.totalPoints >= 0 ? 'var(--color-positive)' : 'var(--color-negative)'} strokeWidth="1.5" />
                    </svg>
                </div>

                <div className="points-col">
                    <span className={`points-value ${entry.totalPoints >= 0 ? 'points-positive' : 'points-negative'}`}>
                        {Math.floor(entry.totalPoints).toLocaleString()} <small>pts</small>
                    </span>
                </div>

                <div className="balance-24h-col">
                    <span className={`balance-chip ${net24h >= 0 ? 'pos' : 'neg'}`}>
                        {net24h >= 0 ? '+' : ''}{Math.floor(net24h).toLocaleString()}
                    </span>
                </div>

                <div className="strikes-col">
                    {entry.strikes > 0 ? (
                        <div className="strike-warning-mini">
                            <span className="strike-count">!{entry.strikes}</span>
                        </div>
                    ) : (
                        <span className="stat-clean">OK</span>
                    )}
                </div>

                <div className="goals-col">
                    <div className="goals-progress-mini">
                        <span className="goals-count">{entry.goalsCompleted}</span>
                        <div className="mini-bar"><div className="fill" style={{ width: `${Math.min(100, (entry.goalsCompleted / 10) * 100)}%` }}></div></div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="leaderboard-container">
            <div className="leaderboard-top-controls">
                <div className="search-box">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="BUSCAR GUERRERO..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>
                {searchTerm && <span className="search-results-count">{sortedEntries.length} ENCONTRADOS</span>}
            </div>

            {/* HALL OF FAME PODIUM - Only show if not searching */}
            {!searchTerm && sortedEntries.length >= 3 && (
                <div className="podium-section">
                    {[1, 0, 2].map(idx => {
                        const entry = podium[idx];
                        if (!entry) return null;
                        const rankInfo = getRankTheme(idx + 1);
                        const league = getLeague(entry.totalPoints);

                        return (
                            <div key={entry.id} className={`podium-item ${rankInfo.class}`} onClick={() => onRowClick?.(entry)}>
                                <div className="podium-avatar-wrapper">
                                    <div className="podium-halo" style={{ background: `radial-gradient(circle, ${league.color}33 0%, transparent 70%)` }}></div>
                                    {entry.avatarUrl ? (
                                        <img src={entry.avatarUrl} alt="" className="podium-avatar" />
                                    ) : (
                                        <div className="podium-placeholder">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</div>
                                    )}
                                    <div className="podium-rank-tag">{rankInfo.label}</div>
                                </div>
                                <div className="podium-info">
                                    <span className="podium-name">{entry.username}</span>
                                    <span className="podium-points" style={{ color: league.color }}>{Math.floor(entry.totalPoints).toLocaleString()} <small>PTS</small></span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="leaderboard-table-container">
                <div className="leaderboard-header">
                    <div className="header-cell">RANGO</div>
                    <div className="header-cell">GUERRERO</div>
                    <div className="header-cell">TENDENCIA</div>
                    <div className="header-cell">BALANCE TOTAL</div>
                    <div className="header-cell">NETO 24H</div>
                    <div className="header-cell">FALTAS</div>
                    <div className="header-cell">MISIÓN</div>
                </div>

                <div className="leaderboard-body">
                    {sortedEntries.map((entry, index) => renderRow(entry, index))}
                    {sortedEntries.length === 0 && (
                        <div className="no-results">
                            <p>NO SE ENCONTRARON GUERREROS EN ESTA FRECUENCIA</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
