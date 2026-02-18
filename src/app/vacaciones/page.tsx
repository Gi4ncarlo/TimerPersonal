'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SupabaseDataStore } from '@/data/supabaseData';
import { VacationService } from '@/core/services/VacationService';
import { User, VacationPeriod } from '@/core/types';
import { getTodayString } from '@/core/utils/dateUtils';
import Navbar from '@/ui/components/Navbar';
import VacationManager from '@/ui/components/VacationManager';
import ProfileModal from '@/ui/components/ProfileModal';
import '../dashboard/dashboard.css';
import LogoLoader from '@/ui/components/LogoLoader';

export default function VacationsPage() {
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [vacationPeriods, setVacationPeriods] = useState<VacationPeriod[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isOnVacation, setIsOnVacation] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const user = await SupabaseDataStore.getCurrentUser();
            if (!user) {
                router.push('/login');
                return;
            }
            setCurrentUser(user);

            const fetchedVacations = await SupabaseDataStore.getVacationPeriods();
            setVacationPeriods(fetchedVacations);

            const today = getTodayString();
            const activeVacation = VacationService.getActiveVacation(fetchedVacations, today);
            setIsOnVacation(!!activeVacation);

        } catch (error) {
            console.error('Error loading vacations:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateVacation = async (startDate: string, endDate: string, reason: string) => {
        await SupabaseDataStore.createVacationPeriod({ startDate, endDate, reason });
        await loadData();
    };

    const handleDeleteVacation = async (id: string) => {
        await SupabaseDataStore.deleteVacationPeriod(id);
        await loadData();
    };

    if (isLoading) return <LogoLoader />;

    return (
        <main className="dashboard">
            <div className="dashboard-container-new">
                <Navbar
                    currentUser={currentUser}
                    userLevel={{ level: currentUser?.level || 1, xp: currentUser?.xp || 0 }}
                    isOnVacation={isOnVacation}
                    onProfileClick={() => setIsProfileModalOpen(true)}
                />

                <div className="vacations-content-wrapper" style={{ maxWidth: '1000px', margin: '0 auto' }}>
                    <div className="vacations-view-header" style={{ marginBottom: 'var(--space-2xl)', textAlign: 'center' }}>
                        <h2 className="text-arcade" style={{ color: 'var(--color-primary)', fontSize: '2rem', marginBottom: 'var(--space-sm)' }}>
                            🏝 Bitácora de Viaje
                        </h2>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.1rem' }}>
                            Gestiona tus periodos de descanso para mantener tu integridad en la Senda.
                        </p>
                    </div>

                    <VacationManager
                        periods={vacationPeriods}
                        onCreatePeriod={handleCreateVacation}
                        onDeletePeriod={handleDeleteVacation}
                    />
                </div>
            </div>

            {currentUser && (
                <ProfileModal
                    user={currentUser}
                    isOpen={isProfileModalOpen}
                    isOnVacation={isOnVacation}
                    onClose={() => setIsProfileModalOpen(false)}
                    onUpdate={() => loadData()}
                />
            )}
        </main>
    );
}
