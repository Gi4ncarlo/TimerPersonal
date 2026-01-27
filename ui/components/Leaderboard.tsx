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
    weekStart: string;
    weekEnd: string;
}

interface LeaderboardProps {
    currentEntry?: LeaderboardEntry;
    entries: LeaderboardEntry[];
    isLoading?: boolean;
}

export default function Leaderboard({ currentEntry, entries, isLoading }: LeaderboardProps) {
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
                    <div className="header-cell points-col">Puntos</div>
                    <div className="header-cell activities-col">Act. (+)</div>
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
                            >
                                <div className="row-cell rank-col">
                                    <span className="rank-number">{rank}</span>
                                    <span className="rank-emoji">{getRankEmoji(rank)}</span>
                                </div>
                                <div className="row-cell username-col">
                                    {entry.username}
                                    {isCurrentUser && <span className="current-badge">TÚ</span>}
                                </div>
                                <div className="row-cell points-col">
                                    <span className={entry.totalPoints >= 0 ? 'points-positive' : 'points-negative'}>
                                        {entry.totalPoints.toLocaleString('es-ES')} pts
                                    </span>
                                </div>
                                <div className="row-cell activities-col">
                                    {entry.positiveActivities}
                                </div>
                                <div className="row-cell goals-col">
                                    {entry.goalsCompleted}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
