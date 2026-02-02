'use client';

import { useState, useEffect } from 'react';
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

export default function Leaderboard({ currentEntry, entries, isLoading, onRowClick }: LeaderboardProps) {
    const [sortedEntries, setSortedEntries] = useState<LeaderboardEntry[]>([]);

    useEffect(() => {
        // Sort by total points descending
        const sorted = [...entries].sort((a, b) => b.totalPoints - a.totalPoints);
        setSortedEntries(sorted);
    }, [entries]);

    const getRankEmoji = (rank: number) => {
        switch (rank) {
            case 1: return '🥇';
            case 2: return '🥈';
            case 3: return '🥉';
            default: return '';
        }
    };

    const getRankClass = (rank: number) => {
        if (rank === 1) return 'rank-gold';
        if (rank === 2) return 'rank-silver';
        if (rank === 3) return 'rank-bronze';
        return '';
    };

    if (isLoading) {
        return (
            <div className="leaderboard-container">
                <p className="loading-text">Cargando clasificación...</p>
            </div>
        );
    }

    if (entries.length === 0) {
        return (
            <div className="leaderboard-container">
                <p className="empty-text">No hay datos de clasificación para esta semana.</p>
            </div>
        );
    }

    return (
        <div className="leaderboard-container">
            <div className="leaderboard-table">
                <div className="leaderboard-header">
                    <div className="header-cell rank-col">Pos</div>
                    <div className="header-cell username-col">Usuario</div>
                    <div className="header-cell points-col">Puntos Totales</div>
                    <div className="header-cell strikes-col">Strykes</div>
                    <div className="header-cell points-24h-col">24h (+/-)</div>
                    <div className="header-cell goals-col">Objetivos</div>
                </div>

                <div className="leaderboard-body">
                    {sortedEntries.map((entry, index) => {
                        const rank = index + 1;
                        const isCurrentUser = currentEntry?.userId === entry.userId;

                        return (
                            <div
                                key={entry.id}
                                className={`leaderboard-row ${getRankClass(rank)} ${isCurrentUser ? 'current-user' : ''}`}
                                onClick={() => onRowClick && onRowClick(entry)}
                                style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                            >
                                <div className="row-cell rank-col">
                                    <span className="rank-number">{rank}</span>
                                    <span className="rank-emoji">{getRankEmoji(rank)}</span>
                                </div>
                                <div className="row-cell username-col">
                                    <div className="avatar-info-group">
                                        {entry.avatarUrl ? (
                                            <img src={entry.avatarUrl} alt="" className="user-avatar-small" />
                                        ) : (
                                            <div className="avatar-placeholder-small">{entry.username.charAt(0).toUpperCase()}</div>
                                        )}
                                        <div className="user-info-stack">
                                            <span className="username-text">{entry.username}</span>
                                            {isCurrentUser && <span className="current-badge">TÚ</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="row-cell points-col">
                                    <span className={entry.totalPoints >= 0 ? 'points-positive' : 'points-negative'}>
                                        {Math.floor(entry.totalPoints).toLocaleString('es-ES')} pts
                                    </span>
                                </div>
                                <div className="row-cell strikes-col">
                                    {entry.strikes > 0 ? (
                                        <span className="strikes-count">⚡ {entry.strikes}</span>
                                    ) : (
                                        <span className="strikes-empty">-</span>
                                    )}
                                </div>
                                <div className="row-cell points-24h-col">
                                    <div className="stats-24h">
                                        {(entry.pointsLast24hPositive || 0) > 0 &&
                                            <span className="stat-pos">+{Math.floor(entry.pointsLast24hPositive || 0)}</span>
                                        }
                                        {(entry.pointsLast24hNegative || 0) < 0 &&
                                            <span className="stat-neg">{Math.floor(entry.pointsLast24hNegative || 0)}</span>
                                        }
                                        {!(entry.pointsLast24hPositive) && !(entry.pointsLast24hNegative) &&
                                            <span className="stat-neutral">-</span>
                                        }
                                    </div>
                                </div>
                                <div className="row-cell goals-col">
                                    {entry.goalsCompleted} <span className="cell-label">obj.</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
