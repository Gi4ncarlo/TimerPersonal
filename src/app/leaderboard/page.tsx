'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Leaderboard from '@/ui/components/Leaderboard';
import QuestCard from '@/ui/components/QuestCard';
import { SupabaseDataStore } from '@/data/supabaseData';
import { getWeekStartString, getWeekEndString } from '@/core/utils/dateUtils';
import UserStatsModal from '@/ui/components/UserStatsModal';
import './leaderboard.css';

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

export default function LeaderboardPage() {
    const router = useRouter();
    const [viewMode, setViewMode] = useState<'weekly' | 'general'>('weekly');
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [currentEntry, setCurrentEntry] = useState<LeaderboardEntry | undefined>();
    const [isLoading, setIsLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<LeaderboardEntry | null>(null);

    useEffect(() => {
        loadLeaderboard();
    }, [viewMode]);

    const loadLeaderboard = async () => {
        setIsLoading(true);
        try {
            const user = await SupabaseDataStore.getCurrentUser();
            if (!user) {
                router.push('/login');
                return;
            }

            let leaderboardData;

            if (viewMode === 'general') {
                leaderboardData = await SupabaseDataStore.getAllTimeLeaderboard();
            } else {
                // Match the DataStore logic: Week starts on Monday (Argentina Time)
                const weekStart = getWeekStartString();
                const weekEnd = getWeekEndString();
                leaderboardData = await SupabaseDataStore.getLeaderboardStats(weekStart, weekEnd);
            }

            setEntries(leaderboardData);
            const userEntry = leaderboardData.find(e => e.userId === user.id);
            setCurrentEntry(userEntry);
        } catch (error) {
            console.error('Error loading leaderboard:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="leaderboard-page">
            <div className="leaderboard-container-wrapper">
                <header className="page-header">
                    <div className="title-area">
                        <h1 className="page-title">🏆 Clasificación {viewMode === 'weekly' ? 'Semanal' : 'General'}</h1>
                        <p className="page-subtitle">{viewMode === 'weekly' ? 'Ranking de esta semana' : 'Ranking histórico de usuarios'}</p>
                    </div>
                    <div className="header-controls">
                        <div className="view-toggle">
                            <button
                                className={`toggle-btn ${viewMode === 'weekly' ? 'active' : ''}`}
                                onClick={() => setViewMode('weekly')}
                            >
                                Semanal
                            </button>
                            <button
                                className={`toggle-btn ${viewMode === 'general' ? 'active' : ''}`}
                                onClick={() => setViewMode('general')}
                            >
                                General
                            </button>
                        </div>
                        <button onClick={loadLeaderboard} className="refresh-btn" disabled={isLoading}>
                            {isLoading ? '...' : '🔄 Refrescar'}
                        </button>
                        <Link href="/dashboard" className="back-link">
                            ← Volver al Dashboard
                        </Link>
                    </div>
                </header>

                <QuestCard title="LEADERBOARD" subtitle="Semana actual">
                    <Leaderboard
                        entries={entries}
                        currentEntry={currentEntry}
                        isLoading={isLoading}
                        onRowClick={(entry) => setSelectedUser(entry)}
                    />
                </QuestCard>

                {selectedUser && (
                    <UserStatsModal
                        entry={selectedUser}
                        isOpen={!!selectedUser}
                        onClose={() => setSelectedUser(null)}
                    />
                )}
            </div>
        </main>
    );
}
