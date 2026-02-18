'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Leaderboard from '@/ui/components/Leaderboard';
import QuestCard from '@/ui/components/QuestCard';
import { SupabaseDataStore } from '@/data/supabaseData';
import { getWeekStartString, getWeekEndString } from '@/core/utils/dateUtils';
import UserStatsModal from '@/ui/components/UserStatsModal';
import Navbar from '@/ui/components/Navbar';
import ProfileModal from '@/ui/components/ProfileModal';
import { User, VacationPeriod } from '@/core/types';
import { VacationService } from '@/core/services/VacationService';
import { getTodayString } from '@/core/utils/dateUtils';
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
    avatarUrl?: string;
    isOnVacation?: boolean;
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

    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isOnVacation, setIsOnVacation] = useState(false);

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

            const leaderboardData = viewMode === 'general'
                ? await SupabaseDataStore.getAllTimeLeaderboard()
                : await SupabaseDataStore.getLeaderboardStats(getWeekStartString(), getWeekEndString());

            setEntries(leaderboardData);
            const userEntry = leaderboardData.find(e => e.userId === user.id);
            setCurrentEntry(userEntry);

            // Vacation status for Navbar
            const vacations = await SupabaseDataStore.getVacationPeriods();
            const activeVacation = VacationService.getActiveVacation(vacations, getTodayString());
            setIsOnVacation(!!activeVacation);
        } catch (error) {
            console.error('Error loading leaderboard:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="leaderboard-page">
            <div className="leaderboard-container-wrapper">
                <Navbar
                    currentUser={currentUser}
                    userLevel={currentUser ? { level: currentUser.level, xp: currentUser.xp } : undefined}
                    isOnVacation={isOnVacation}
                    onProfileClick={() => setIsProfileModalOpen(true)}
                />

                <header className="page-header">
                    <div className="title-area">
                        <h1 className="page-title">{viewMode === 'weekly' ? '📡 Clasificación Semanal' : '🪐 Clasificación General'}</h1>
                        <p className="page-subtitle">
                            {viewMode === 'weekly'
                                ? 'Monitoreando el rendimiento del ciclo actual'
                                : 'Registro histórico de la Orden de Guerreros'}
                        </p>
                    </div>
                    <div className="header-controls" style={{ gap: 'var(--space-md)' }}>
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
                            {isLoading ? '...' : '🔄 Sincronizar'}
                        </button>
                    </div>
                </header>

                <QuestCard
                    title={viewMode === 'weekly' ? 'REPORTE SEMANAL' : 'ARCHIVOS GENERALES'}
                    subtitle={viewMode === 'weekly' ? 'DATOS EN TIEMPO REAL' : 'TOTAL ACUMULADO'}
                >
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

                {currentUser && (
                    <ProfileModal
                        user={currentUser}
                        isOpen={isProfileModalOpen}
                        onClose={() => setIsProfileModalOpen(false)}
                        onUpdate={() => loadLeaderboard()}
                    />
                )}
            </div>
        </main>
    );
}
