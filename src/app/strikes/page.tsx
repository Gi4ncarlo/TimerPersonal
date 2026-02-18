'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SupabaseDataStore } from '@/data/supabaseData';
import { StrikeDetector } from '@/core/services/StrikeDetector';
import { Strike, StrikeStats, User, VacationPeriod } from '@/core/types';
import Navbar from '@/ui/components/Navbar';
import ProfileModal from '@/ui/components/ProfileModal';
import { getTodayString } from '@/core/utils/dateUtils';
import { VacationService } from '@/core/services/VacationService';
import '../dashboard/dashboard.css';
import LogoLoader from '@/ui/components/LogoLoader';

export default function StrikesPage() {
    const [strikes, setStrikes] = useState<Strike[]>([]);
    const [stats, setStats] = useState<StrikeStats | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isOnVacation, setIsOnVacation] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const user = await SupabaseDataStore.getCurrentUser();
            setCurrentUser(user);

            const [fetchedStrikes, fetchedVacations] = await Promise.all([
                SupabaseDataStore.getStrikes(),
                SupabaseDataStore.getVacationPeriods(),
            ]);
            setStrikes(fetchedStrikes);

            const calculatedStats = StrikeDetector.calculateStats(fetchedStrikes);
            setStats(calculatedStats);

            const today = getTodayString();
            const activeVacation = VacationService.getActiveVacation(fetchedVacations, today);
            setIsOnVacation(!!activeVacation);

        } catch (error) {
            console.error('Error loading strikes:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) return <LogoLoader />;

    const hasStrikes = strikes.length > 0;

    return (
        <main className="dashboard">
            <div className="dashboard-container-new">
                <Navbar
                    currentUser={currentUser}
                    userLevel={currentUser ? { level: currentUser.level, xp: currentUser.xp } : undefined}
                    isOnVacation={isOnVacation}
                    onProfileClick={() => setIsProfileModalOpen(true)}
                />

                <div className="strikes-view-header" style={{ marginBottom: 'var(--space-xl)' }}>
                    <h2 className="text-arcade" style={{ color: '#ff4444', fontSize: '1.8rem' }}>Historial de Faltas</h2>
                    <p style={{ color: 'var(--color-text-secondary)' }}>Registro de interrupciones en tu progreso.</p>
                </div>

                <div className="dashboard-grid-new">
                    {/* LEFT COLUMN - Stats & Navigation Link */}
                    <div className="left-column">
                        <div className="accumulated-time-card negative" style={{ borderColor: '#ff4444' }}>
                            <p className="accumulated-label" style={{ color: '#ff4444' }}>
                                RACHA ACTUAL SIN STRIKES
                            </p>
                            <div style={{ fontSize: '4rem', fontWeight: '900', color: '#fff' }}>
                                {stats?.currentStreak || 0}
                                <span style={{ fontSize: '1rem', fontWeight: 'normal', color: '#aaa', marginLeft: '10px' }}>días</span>
                            </div>
                        </div>

                        <div className="accumulated-time-card" style={{ borderColor: '#ff4444', background: 'rgba(42, 10, 10, 0.4)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                                <div>
                                    <p className="accumulated-label" style={{ fontSize: '1rem' }}>Total Strikes</p>
                                    <h3 style={{ fontSize: '2rem', color: '#ff4444' }}>{stats?.totalStrikes}</h3>
                                </div>
                                <div>
                                    <p className="accumulated-label" style={{ fontSize: '1rem' }}>Peor Racha</p>
                                    <h3 style={{ fontSize: '2rem', color: '#ff4444' }}>{stats?.longestStreak}</h3>
                                </div>
                            </div>
                        </div>

                        {/* Link to Vacation Bitácora */}
                        <div className="vacation-promo-card" style={{
                            background: 'rgba(168, 85, 247, 0.05)',
                            border: '1px dashed var(--color-primary)',
                            borderRadius: 'var(--radius-lg)',
                            padding: 'var(--space-xl)',
                            textAlign: 'center',
                            marginTop: 'var(--space-xl)'
                        }}>
                            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: 'var(--space-md)' }}>🏖</span>
                            <h3 style={{ color: 'var(--color-primary)', marginBottom: 'var(--space-sm)' }}>¿Planeas un descanso?</h3>
                            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--space-lg)' }}>
                                Declara tus vacaciones en la Bitácora para evitar strikes injustos.
                            </p>
                            <Link href="/vacaciones" className="nav-item" style={{ width: '100%', justifyContent: 'center' }}>
                                IR A LA BITÁCORA
                            </Link>
                        </div>
                    </div>

                    {/* RIGHT COLUMN - Strike History */}
                    <div className="right-column">
                        <div className="quest-card" style={{ borderColor: '#ff4444' }}>
                            <h2 className="quest-title" style={{ color: '#ff4444' }}>HISTORIAL DE FALTAS</h2>

                            {!hasStrikes ? (
                                <p className="no-records">¡Excelente! No tienes ningún strike registrado.</p>
                            ) : (
                                <div className="records-list">
                                    {strikes.map(strike => (
                                        <div key={strike.id} className="record-item" style={{ borderColor: '#ff4444', background: 'rgba(42, 10, 10, 0.3)' }}>
                                            <div className="record-header">
                                                <span className="record-name" style={{ color: '#ff4444' }}>STRIKE</span>
                                                <span className="record-time" style={{ color: '#aaa' }}>Detectado: {new Date(strike.detectedAt).toLocaleDateString()}</span>
                                            </div>
                                            <p className="record-notes" style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 'bold', marginBottom: 'var(--space-md)' }}>
                                                {strike.strikeDate}
                                            </p>

                                            {strike.pointsBefore !== undefined ? (
                                                <div className="strike-financials">
                                                    <div className="fin-row">
                                                        <span>Balance Global:</span>
                                                        <span className="fin-val">{Math.floor(strike.pointsBefore)}</span>
                                                    </div>
                                                    <div className="fin-row penalty">
                                                        <span>Sanción:</span>
                                                        <span className="fin-val">{strike.pointsDeducted && strike.pointsDeducted > 0 ? `-${Math.floor(strike.pointsDeducted)}` : '0'}</span>
                                                    </div>
                                                    {strike.pointsDeducted && strike.pointsDeducted > 0 ? (
                                                        <div className="fin-row balance">
                                                            <span>Balance Posterior:</span>
                                                            <span className="fin-val">{Math.floor(strike.balanceAfter || 0)}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="fin-row balance" style={{ borderTop: 'none', paddingTop: 0 }}>
                                                            <span style={{ fontSize: '0.8rem', color: '#888', fontStyle: 'italic' }}>
                                                                ℹ️ No se aplicó descuento (balance insuficiente o nulo).
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="strike-financials-empty">
                                                    <span style={{ fontSize: '0.75rem', color: '#666', fontStyle: 'italic' }}>
                                                        ℹ️ Datos financieros no disponibles para faltas antiguas.
                                                    </span>
                                                </div>
                                            )}

                                            <p className="record-notes" style={{ marginTop: 'var(--space-sm)', opacity: 0.8 }}>{strike.reason}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
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
