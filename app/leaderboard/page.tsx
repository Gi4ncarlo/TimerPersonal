'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Leaderboard from '@/ui/components/Leaderboard';
import QuestCard from '@/ui/components/QuestCard';
import { SupabaseDataStore } from '@/data/supabaseData';
import { startOfWeek, endOfWeek } from 'date-fns';
import './leaderboard.css';

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

export default function LeaderboardPage() {
    const router = useRouter();
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [currentEntry, setCurrentEntry] = useState<LeaderboardEntry | undefined>();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadLeaderboard();
    }, []);

    const loadLeaderboard = async () => {
        try {
            const user = await SupabaseDataStore.getCurrentUser();
            if (!user) {
                router.push('/login');
                return;
            }

            const now = new Date();
            const weekStart = startOfWeek(now).toISOString().split('T')[0];
            const weekEnd = endOfWeek(now).toISOString().split('T')[0];

            // This function will be implemented in supabaseData.ts
            const leaderboardData = await SupabaseDataStore.getLeaderboardStats(weekStart, weekEnd);

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
                        <h1 className="page-title">🏆 Clasificación Semanal</h1>
                        <p className="page-subtitle">Ranking de usuarios por puntos</p>
                    </div>
                    <Link href="/dashboard" className="back-link">
                        ← Volver al Dashboard
                    </Link>
                </header>

                <QuestCard title="LEADERBOARD" subtitle="Semana actual">
                    <Leaderboard
                        entries={entries}
                        currentEntry={currentEntry}
                        isLoading={isLoading}
                    />
                </QuestCard>
            </div>
        </main>
    );
}
