'use client';

import { useState, useEffect, useMemo } from 'react';
import { Tournament, TournamentParticipant } from '@/core/types';
import { TournamentEngine } from '@/core/services/TournamentEngine';
import { getTimeRemainingInWeek } from '@/core/utils/dateUtils';
import Twemoji from './Twemoji';
import './WeeklyTournamentCard.css';

interface WeeklyTournamentCardProps {
    tournament: Tournament | null;
    participants: TournamentParticipant[];
    currentUserId: string;
    lastWinner?: { username: string; emoji: string } | null;
    isLoading?: boolean;
}

export default function WeeklyTournamentCard({
    tournament,
    participants,
    currentUserId,
    lastWinner,
    isLoading = false,
}: WeeklyTournamentCardProps) {

    // ── Countdown Timer ─────────────────────────────
    const [timeLeft, setTimeLeft] = useState(getTimeRemainingInWeek());

    useEffect(() => {
        const interval = setInterval(() => {
            setTimeLeft(getTimeRemainingInWeek());
        }, 60_000); // Update every minute
        return () => clearInterval(interval);
    }, []);

    // ── Derived Data ────────────────────────────────
    const maxScore = useMemo(
        () => Math.max(1, ...participants.map(p => p.score)),
        [participants]
    );

    const currentUserRank = useMemo(
        () => participants.find(p => p.userId === currentUserId)?.rank ?? null,
        [participants, currentUserId]
    );

    const scoringUnit = tournament
        ? TournamentEngine.getScoringUnit(tournament.category)
        : 'puntos';

    const rewardTiers = TournamentEngine.getAllRewardTiers();

    // ── Loading State ───────────────────────────────
    if (isLoading) {
        return (
            <div className="wt-card" data-category="total">
                <div className="wt-loading">
                    <div className="wt-loading-bar" />
                    <span>Cargando torneo...</span>
                </div>
            </div>
        );
    }

    // ── No Tournament ───────────────────────────────
    if (!tournament) {
        return (
            <div className="wt-card" data-category="total">
                <div className="wt-empty">
                    <span className="wt-empty-icon">🏆</span>
                    <span>No hay torneo esta semana</span>
                </div>
            </div>
        );
    }

    const isCompleted = tournament.status === 'completed';

    // ── Rank class helper ───────────────────────────
    const getRankClass = (rank: number) => {
        if (rank === 1) return 'wt-rank--1';
        if (rank === 2) return 'wt-rank--2';
        if (rank === 3) return 'wt-rank--3';
        return 'wt-rank--other';
    };

    const getRankEmoji = (rank: number) => {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return `${rank}`;
    };

    const formatCountdown = () => {
        const { days, hours, minutes } = timeLeft;
        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    // Top 5 participants for the mini leaderboard
    const visibleParticipants = participants.slice(0, 5);

    // If current user is not in top 5, show them below
    const currentUserEntry = participants.find(p => p.userId === currentUserId);
    const showSelfBelow = currentUserEntry && currentUserEntry.rank > 5;

    return (
        <div
            className={`wt-card ${isCompleted ? 'wt-card--completed' : ''}`}
            data-category={tournament.category}
        >
            {/* ── Header ──────────────────────────────── */}
            <div className="wt-header">
                <div className="wt-header-left">
                    <div className="wt-header-icon">
                        <Twemoji emoji={tournament.emoji} />
                    </div>
                    <div className="wt-header-text">
                        <h3 className="wt-title">{tournament.title}</h3>
                        <span className="wt-description">{tournament.description}</span>
                    </div>
                </div>

                <div className="wt-header-right">
                    <span className="wt-category-badge">
                        <Twemoji emoji={tournament.emoji} />
                        {tournament.category}
                    </span>
                    {!isCompleted && (
                        <div className="wt-countdown">
                            <span className="wt-countdown-icon">⏱️</span>
                            <span className="wt-countdown-text">{formatCountdown()}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Winner Banner (Completed) ──────────── */}
            {isCompleted && tournament.winnerUsername && (
                <div className="wt-winner-banner">
                    <Twemoji emoji="🏆" />
                    Ganador: {tournament.winnerUsername}
                    <Twemoji emoji="🏆" />
                </div>
            )}

            {/* ── Leaderboard ─────────────────────────── */}
            <div className="wt-leaderboard">
                <div className="wt-lb-header">
                    <span className="wt-lb-title">Clasificación</span>
                    <span className="wt-lb-unit">{scoringUnit}</span>
                </div>

                {participants.length === 0 ? (
                    <div className="wt-empty">
                        <span>Aún no hay participantes. ¡Registra una actividad para unirte!</span>
                    </div>
                ) : (
                    <div className="wt-lb-list">
                        {visibleParticipants.map((participant, index) => {
                            const isSelf = participant.userId === currentUserId;
                            const barWidth = maxScore > 0 ? (participant.score / maxScore) * 100 : 0;

                            return (
                                <div
                                    key={participant.userId}
                                    className={`wt-participant ${isSelf ? 'wt-participant--self' : ''}`}
                                    style={{ animationDelay: `${index * 0.06}s` }}
                                >
                                    <div className={`wt-rank ${getRankClass(participant.rank)}`}>
                                        {getRankEmoji(participant.rank)}
                                    </div>
                                    <div className="wt-participant-info">
                                        <span className="wt-participant-name">
                                            {participant.username}
                                            {isSelf && ' (tú)'}
                                        </span>
                                        <div className="wt-participant-bar-track">
                                            <div
                                                className="wt-participant-bar-fill"
                                                style={{ width: `${Math.max(2, barWidth)}%` }}
                                            />
                                        </div>
                                    </div>
                                    <span className="wt-participant-score">
                                        {participant.score.toLocaleString('es-AR')}
                                    </span>
                                </div>
                            );
                        })}

                        {/* Show current user below top 5 if needed */}
                        {showSelfBelow && currentUserEntry && (
                            <>
                                <div style={{
                                    textAlign: 'center',
                                    color: 'var(--color-text-muted)',
                                    fontSize: '0.7rem',
                                    padding: '2px 0',
                                    opacity: 0.5,
                                }}>
                                    • • •
                                </div>
                                <div className="wt-participant wt-participant--self">
                                    <div className={`wt-rank ${getRankClass(currentUserEntry.rank)}`}>
                                        {currentUserEntry.rank}
                                    </div>
                                    <div className="wt-participant-info">
                                        <span className="wt-participant-name">
                                            {currentUserEntry.username} (tú)
                                        </span>
                                        <div className="wt-participant-bar-track">
                                            <div
                                                className="wt-participant-bar-fill"
                                                style={{ width: `${Math.max(2, (currentUserEntry.score / maxScore) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                    <span className="wt-participant-score">
                                        {currentUserEntry.score.toLocaleString('es-AR')}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* ── Footer ──────────────────────────────── */}
            <div className="wt-footer">
                <div className="wt-reward-info">
                    <span className="wt-reward-icon">🎁</span>
                    <span className="wt-reward-text">
                        Premio: <strong>x{rewardTiers[0].multiplier}</strong> por{' '}
                        <strong>{rewardTiers[0].durationHours}h</strong>
                        {' · '}
                        {TournamentEngine.isGlobalReward(tournament.category)
                            ? 'global'
                            : TournamentEngine.getRewardActionNames(tournament.category).join(', ')
                        }
                    </span>
                </div>

                {lastWinner && (
                    <div className="wt-last-winner">
                        <Twemoji emoji={lastWinner.emoji} />
                        <span>Último: </span>
                        <span className="wt-last-winner-name">{lastWinner.username}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
