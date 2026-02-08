'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SupabaseDataStore } from '@/data/supabaseData';
import { StrikeDetector } from '@/core/services/StrikeDetector';
import { Strike, StrikeStats } from '@/core/types';
import '../dashboard/dashboard.css';

export default function StrikesPage() {
    const [strikes, setStrikes] = useState<Strike[]>([]);
    const [stats, setStats] = useState<StrikeStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const fetchedStrikes = await SupabaseDataStore.getStrikes();
            setStrikes(fetchedStrikes);

            const calculatedStats = StrikeDetector.calculateStats(fetchedStrikes);
            setStats(calculatedStats);
        } catch (error) {
            console.error('Error loading strikes:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) return <div className="loading">Cargando strikes...</div>;

    const hasStrikes = strikes.length > 0;

    return (
        <main className="dashboard">
            <div className="dashboard-container-new">
                <header className="dashboard-header">
                    <div className="title-area">
                        <h1 className="main-title" style={{ color: '#ff4444' }}>Historial de Strikes</h1>
                        <p style={{ color: '#aaa', marginTop: '0.5rem' }}>Registro de días sin actividad</p>
                    </div>

                    <div className="header-actions">
                        <Link href="/dashboard" className="nav-link">← Volver al Dashboard</Link>
                    </div>
                </header>

                <div className="dashboard-grid-new">
                    {/* LEFT COLUMN - Stats */}
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
                    </div>

                    {/* RIGHT COLUMN - History */}
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
                                            <p className="record-notes" style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 'bold' }}>
                                                {strike.strikeDate}
                                            </p>
                                            <p className="record-notes">{strike.reason}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
