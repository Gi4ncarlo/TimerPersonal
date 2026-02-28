'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SupabaseDataStore } from '@/data/supabaseData';
import { StrikeDetector } from '@/core/services/StrikeDetector';
import { Strike, StrikeStats, User } from '@/core/types';
import Navbar from '@/ui/components/Navbar';
import ProfileModal from '@/ui/components/ProfileModal';
import { getTodayString } from '@/core/utils/dateUtils';
import { VacationService } from '@/core/services/VacationService';
import StrikeIcon from '@/ui/components/icons/StrikeIcon';
import '../dashboard/dashboard.css';
import LogoLoader from '@/ui/components/LogoLoader';

/* ─── Consequence Tiers ─── */
const TIERS = [
    {
        min: 0, max: 0,
        label: '¡Impecable!',
        emoji: '✅',
        color: '#4ade80',
        bg: 'rgba(74, 222, 128, 0.06)',
        border: 'rgba(74, 222, 128, 0.2)',
        desc: 'Sin faltas. Tus ganancias no tienen ninguna reducción.',
    },
    {
        min: 1, max: 2,
        label: 'Advertencia',
        emoji: '⚠️',
        color: '#facc15',
        bg: 'rgba(250, 204, 21, 0.06)',
        border: 'rgba(250, 204, 21, 0.2)',
        desc: 'Cada falta aplica una sanción puntual sobre tu balance global.',
    },
    {
        min: 3, max: 4,
        label: 'Peligro',
        emoji: '🔥',
        color: '#f97316',
        bg: 'rgba(249, 115, 22, 0.06)',
        border: 'rgba(249, 115, 22, 0.2)',
        desc: '-10% en todas tus ganancias. Ítems ofensivos bloqueados.',
    },
    {
        min: 5, max: Infinity,
        label: 'Crítico',
        emoji: '🚨',
        color: '#ef4444',
        bg: 'rgba(239, 68, 68, 0.08)',
        border: 'rgba(239, 68, 68, 0.25)',
        desc: '-25% en todas tus ganancias. Ítems ofensivos bloqueados. ¡Compra una amnistía urgente!',
    },
];

function getCurrentTier(count: number) {
    return TIERS.find(t => count >= t.min && count <= t.max) || TIERS[0];
}

/* ─── CSS-in-JS ─── */
const css = `
.sk-page { padding-bottom: 60px; }

.sk-hero {
    text-align: center;
    margin-bottom: 32px;
}
.sk-hero h2 {
    font-family: 'Playfair Display', serif;
    font-size: 2rem;
    font-weight: 800;
    color: #ef4444;
    margin: 0 0 6px;
}
.sk-hero p {
    color: rgba(255,255,255,0.5);
    font-size: 0.9rem;
    margin: 0;
}

/* ─ Consequences Legend ─ */
.sk-legend {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 32px;
}
@media (max-width: 768px) {
    .sk-legend { grid-template-columns: repeat(2, 1fr); }
}
.sk-tier {
    border-radius: 14px;
    padding: 16px;
    text-align: center;
    transition: transform 0.2s, box-shadow 0.3s;
    position: relative;
}
.sk-tier--active {
    transform: scale(1.04);
    box-shadow: 0 0 20px var(--tier-glow);
}
.sk-tier--active::after {
    content: 'TÚ ESTÁS AQUÍ';
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 1px;
    color: var(--tier-color);
    background: var(--tier-bg);
    border: 1px solid var(--tier-border);
    padding: 2px 10px;
    border-radius: 100px;
    white-space: nowrap;
}
.sk-tier__emoji { font-size: 1.8rem; display: block; margin-bottom: 6px; }
.sk-tier__label {
    font-family: 'Sora', sans-serif;
    font-weight: 700;
    font-size: 0.85rem;
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-bottom: 4px;
}
.sk-tier__range {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.72rem;
    color: rgba(255,255,255,0.4);
    margin-bottom: 8px;
}
.sk-tier__desc {
    font-size: 0.75rem;
    color: rgba(255,255,255,0.55);
    line-height: 1.4;
}

/* ─ Two-column layout ─ */
.sk-grid {
    display: grid;
    grid-template-columns: 320px 1fr;
    gap: 24px;
    align-items: start;
}
@media (max-width: 900px) {
    .sk-grid { grid-template-columns: 1fr; }
}

/* ─ Sidebar ─ */
.sk-sidebar { display: flex; flex-direction: column; gap: 16px; }

.sk-stat-card {
    border-radius: 14px;
    padding: 20px;
    border: 1px solid rgba(239, 68, 68, 0.15);
    background: rgba(42, 10, 10, 0.25);
}
.sk-stat-label {
    font-family: 'Sora', sans-serif;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.45);
    margin-bottom: 6px;
}
.sk-stat-value {
    font-family: 'JetBrains Mono', monospace;
    font-size: 2.4rem;
    font-weight: 900;
    color: #fff;
    line-height: 1;
}
.sk-stat-unit {
    font-size: 0.85rem;
    font-weight: 400;
    color: rgba(255,255,255,0.4);
    margin-left: 6px;
}

.sk-stat-duo {
    display: flex;
    gap: 16px;
}
.sk-stat-duo > div {
    flex: 1;
    border-radius: 14px;
    padding: 16px;
    border: 1px solid rgba(239, 68, 68, 0.12);
    background: rgba(42, 10, 10, 0.2);
}

/* ─ CTA Card ─ */
.sk-cta {
    border-radius: 14px;
    padding: 24px 20px;
    text-align: center;
    border: 1px dashed;
    transition: transform 0.2s;
}
.sk-cta:hover { transform: translateY(-2px); }
.sk-cta__emoji { font-size: 2.2rem; display: block; margin-bottom: 8px; }
.sk-cta__title {
    font-family: 'Sora', sans-serif;
    font-weight: 700;
    font-size: 1rem;
    margin-bottom: 4px;
}
.sk-cta__desc {
    font-size: 0.82rem;
    color: rgba(255,255,255,0.5);
    margin-bottom: 14px;
    line-height: 1.5;
}
.sk-cta__btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, #6c63ff, #8b5cf6);
    color: #fff;
    border: none;
    border-radius: 10px;
    padding: 10px 24px;
    font-family: 'Sora', sans-serif;
    font-weight: 700;
    font-size: 0.82rem;
    letter-spacing: 1px;
    cursor: pointer;
    transition: opacity 0.2s;
}
.sk-cta__btn:hover { opacity: 0.9; }

/* ─ Clean message ─ */
.sk-clean {
    border-radius: 16px;
    padding: 40px 24px;
    text-align: center;
    background: rgba(74, 222, 128, 0.04);
    border: 1px solid rgba(74, 222, 128, 0.15);
}
.sk-clean__emoji { font-size: 3rem; display: block; margin-bottom: 12px; }
.sk-clean__title {
    font-family: 'Playfair Display', serif;
    font-size: 1.4rem;
    font-weight: 700;
    color: #4ade80;
    margin-bottom: 8px;
}
.sk-clean__desc {
    color: rgba(255,255,255,0.5);
    font-size: 0.9rem;
    line-height: 1.6;
    max-width: 400px;
    margin: 0 auto;
}

/* ─ History List ─ */
.sk-history {
    border-radius: 16px;
    border: 1px solid rgba(239, 68, 68, 0.12);
    background: rgba(15, 5, 5, 0.4);
    overflow: hidden;
}
.sk-history__header {
    padding: 16px 20px;
    border-bottom: 1px solid rgba(239, 68, 68, 0.1);
    display: flex;
    align-items: center;
    gap: 8px;
}
.sk-history__title {
    font-family: 'Sora', sans-serif;
    font-weight: 700;
    font-size: 0.8rem;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #ef4444;
}
.sk-history__count {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.7rem;
    font-weight: 600;
    color: rgba(255,255,255,0.4);
    background: rgba(239, 68, 68, 0.1);
    padding: 2px 8px;
    border-radius: 100px;
}

.sk-strike-item {
    padding: 16px 20px;
    border-bottom: 1px solid rgba(255,255,255,0.03);
    transition: background 0.15s;
}
.sk-strike-item:last-child { border-bottom: none; }
.sk-strike-item:hover { background: rgba(239, 68, 68, 0.04); }

.sk-strike-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
}
.sk-strike-date {
    font-family: 'JetBrains Mono', monospace;
    font-weight: 700;
    font-size: 0.95rem;
    color: #fff;
}
.sk-strike-detected {
    font-size: 0.72rem;
    color: rgba(255,255,255,0.35);
}
.sk-strike-reason {
    font-size: 0.8rem;
    color: rgba(255,255,255,0.5);
    margin-bottom: 8px;
}
.sk-strike-fin {
    display: flex;
    gap: 16px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.72rem;
}
.sk-strike-fin span {
    color: rgba(255,255,255,0.4);
}
.sk-strike-fin .sk-val { color: rgba(255,255,255,0.7); font-weight: 600; }
.sk-strike-fin .sk-penalty { color: #ef4444; font-weight: 700; }
`;

export default function StrikesPage() {
    const router = useRouter();
    const [strikes, setStrikes] = useState<Strike[]>([]);
    const [stats, setStats] = useState<StrikeStats | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isOnVacation, setIsOnVacation] = useState(false);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const user = await SupabaseDataStore.getCurrentUser();
            setCurrentUser(user);

            const [fetchedStrikes, fetchedVacations] = await Promise.all([
                SupabaseDataStore.getStrikes(),
                SupabaseDataStore.getVacationPeriods(),
            ]);
            setStrikes(fetchedStrikes);
            setStats(StrikeDetector.calculateStats(fetchedStrikes));

            const activeVacation = VacationService.getActiveVacation(fetchedVacations, getTodayString());
            setIsOnVacation(!!activeVacation);
        } catch (error) {
            console.error('Error loading strikes:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) return <LogoLoader />;

    const strikeCount = strikes.length;
    const currentTier = getCurrentTier(strikeCount);
    const hasStrikes = strikeCount > 0;

    return (
        <main className="dashboard">
            <style>{css}</style>
            <div className="dashboard-container-new sk-page">
                <Navbar
                    currentUser={currentUser}
                    userLevel={currentUser ? { level: currentUser.level, xp: currentUser.xp } : undefined}
                    isOnVacation={isOnVacation}
                    onProfileClick={() => setIsProfileModalOpen(true)}
                />

                {/* Header */}
                <div className="sk-hero">
                    <h2>⚡ Historial de Faltas</h2>
                    <p>Registro de interrupciones en tu progreso y sus consecuencias.</p>
                </div>

                {/* Consequence Tiers Legend */}
                <div className="sk-legend">
                    {TIERS.map((tier, i) => {
                        const isActive = tier === currentTier;
                        return (
                            <div
                                key={i}
                                className={`sk-tier ${isActive ? 'sk-tier--active' : ''}`}
                                style={{
                                    background: tier.bg,
                                    border: `1px solid ${tier.border}`,
                                    '--tier-color': tier.color,
                                    '--tier-bg': tier.bg,
                                    '--tier-border': tier.border,
                                    '--tier-glow': `${tier.color}30`,
                                    opacity: isActive ? 1 : 0.55,
                                } as React.CSSProperties}
                            >
                                <span className="sk-tier__emoji">
                                    {tier.emoji === '🔥' ? <StrikeIcon width={32} height={32} /> : tier.emoji}
                                </span>
                                <div className="sk-tier__label" style={{ color: tier.color }}>{tier.label}</div>
                                <div className="sk-tier__range">
                                    {tier.max === 0 ? '0 strikes' : tier.max === Infinity ? `${tier.min}+ strikes` : `${tier.min}–${tier.max} strikes`}
                                </div>
                                <div className="sk-tier__desc">{tier.desc}</div>
                            </div>
                        );
                    })}
                </div>

                {/* Two-column grid */}
                <div className="sk-grid">
                    {/* Sidebar */}
                    <div className="sk-sidebar">
                        <div className="sk-stat-card">
                            <div className="sk-stat-label">Racha Sin Strikes</div>
                            <div className="sk-stat-value">
                                {stats?.currentStreak || 0}
                                <span className="sk-stat-unit">días</span>
                            </div>
                        </div>

                        <div className="sk-stat-duo">
                            <div>
                                <div className="sk-stat-label">Total</div>
                                <div className="sk-stat-value" style={{ fontSize: '1.6rem', color: '#ef4444' }}>
                                    {stats?.totalStrikes || 0}
                                </div>
                            </div>
                            <div>
                                <div className="sk-stat-label">Peor Racha</div>
                                <div className="sk-stat-value" style={{ fontSize: '1.6rem', color: '#ef4444' }}>
                                    {stats?.longestStreak || 0}
                                </div>
                            </div>
                        </div>

                        {/* CTA: Shop link or Vacation */}
                        {hasStrikes ? (
                            <div className="sk-cta" style={{
                                borderColor: '#6c63ff',
                                background: 'rgba(108, 99, 255, 0.04)',
                            }}>
                                <span className="sk-cta__emoji">🛡️</span>
                                <div className="sk-cta__title" style={{ color: '#a78bfa' }}>¡Recuperá tu honor!</div>
                                <div className="sk-cta__desc">
                                    Comprá una <strong style={{ color: '#f5c842' }}>Amnistía</strong> en la tienda
                                    y eliminá un strike de tu historial. Desde <strong style={{ color: '#4ade80' }}>15.000 sendas</strong>.
                                </div>
                                <button
                                    className="sk-cta__btn"
                                    onClick={() => router.push('/tienda')}
                                >
                                    IR A LA TIENDA →
                                </button>
                            </div>
                        ) : (
                            <div className="sk-cta" style={{
                                borderColor: 'rgba(74, 222, 128, 0.3)',
                                background: 'rgba(74, 222, 128, 0.04)',
                            }}>
                                <span className="sk-cta__emoji">🏖</span>
                                <div className="sk-cta__title" style={{ color: '#4ade80' }}>¿Planeas un descanso?</div>
                                <div className="sk-cta__desc">
                                    Declara tus vacaciones en la Bitácora para evitar strikes injustos.
                                </div>
                                <Link href="/vacaciones" className="sk-cta__btn" style={{ textDecoration: 'none' }}>
                                    IR A LA BITÁCORA →
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Main content */}
                    <div>
                        {!hasStrikes ? (
                            <div className="sk-clean">
                                <span className="sk-clean__emoji">🏆</span>
                                <div className="sk-clean__title">¡Tu historial está limpio!</div>
                                <div className="sk-clean__desc">
                                    No tenés ningún strike registrado. Seguí con esa disciplina, cada día sin faltas suma a tu racha y te acerca a la grandeza. ¡Sos imparable!
                                </div>
                            </div>
                        ) : (
                            <div className="sk-history">
                                <div className="sk-history__header">
                                    <div className="sk-history__title">📋 Registro Detallado</div>
                                    <div className="sk-history__count">{strikeCount} falta{strikeCount > 1 ? 's' : ''}</div>
                                </div>
                                {strikes.map(strike => (
                                    <div key={strike.id} className="sk-strike-item">
                                        <div className="sk-strike-top">
                                            <span className="sk-strike-date">📅 {strike.strikeDate}</span>
                                            <span className="sk-strike-detected">
                                                Detectado: {new Date(strike.detectedAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="sk-strike-reason">{strike.reason}</div>

                                        {strike.pointsBefore !== undefined ? (
                                            <div className="sk-strike-fin">
                                                <span>Balance: <span className="sk-val">{Math.floor(strike.pointsBefore).toLocaleString()}</span></span>
                                                <span>Sanción: <span className="sk-penalty">
                                                    {strike.pointsDeducted && strike.pointsDeducted > 0 ? `-${Math.floor(strike.pointsDeducted).toLocaleString()}` : '0'}
                                                </span></span>
                                                {strike.pointsDeducted && strike.pointsDeducted > 0 && (
                                                    <span>Después: <span className="sk-val">{Math.floor(strike.balanceAfter || 0).toLocaleString()}</span></span>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="sk-strike-fin">
                                                <span style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.3)' }}>
                                                    ℹ️ Datos financieros no disponibles para faltas antiguas.
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
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
