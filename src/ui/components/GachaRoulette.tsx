'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { GachaEngine } from '@/core/services/GachaEngine';
import { GachaPrize, ActiveBuff, GachaState, PrizeRarity } from '@/core/types';
import Twemoji from './Twemoji';
import GachaWheel from './GachaWheel';
import './GachaRoulette.css';

const FREE_SPIN_COOLDOWN_DAYS = 7;

interface CountdownTime {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
}

// ─── Types ──────────────────────────────────────────
type SpinPhase = 'idle' | 'spinning' | 'revealing' | 'result';

interface GachaRouletteProps {
    isOpen: boolean;
    onClose: () => void;
    currentBalance: number;
    onSpinComplete: () => void; // Callback to refresh dashboard data
}

// ─── Rarity emoji map ───────────────────────────────
const RARITY_EMOJI: Record<PrizeRarity, string> = {
    common: '🪙',
    rare: '💎',
    epic: '⚡',
    troll: '🃏',
    legendary: '👑',
};

const RARITY_LABELS: Record<PrizeRarity, string> = {
    common: 'Común',
    rare: 'Raro',
    epic: 'Épico',
    troll: 'Troll',
    legendary: 'Legendario',
};

// ─── Component ──────────────────────────────────────
export default function GachaRoulette({ isOpen, onClose, currentBalance, onSpinComplete }: GachaRouletteProps) {
    const [phase, setPhase] = useState<SpinPhase>('idle');
    const [gachaState, setGachaState] = useState<GachaState | null>(null);
    const [spinCost, setSpinCost] = useState(5000);
    const [isFree, setIsFree] = useState(false);
    const [result, setResult] = useState<{
        prize: GachaPrize;
        pointsSpent: number;
        wasFreeSpin: boolean;
        newBalance: number;
        buffCreated?: ActiveBuff;
        nextSpinCost: number;
    } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [countdown, setCountdown] = useState<CountdownTime | null>(null);

    // Load gacha state on open
    useEffect(() => {
        if (isOpen) {
            loadGachaState();
            setPhase('idle');
            setResult(null);
            setError(null);
        }
    }, [isOpen]);

    // Live countdown timer for next free spin
    useEffect(() => {
        if (isFree || !gachaState?.freeSpinUsedAt) {
            setCountdown(null);
            return;
        }

        const computeCountdown = () => {
            const usedAt = new Date(gachaState.freeSpinUsedAt!).getTime();
            const nextFreeAt = usedAt + FREE_SPIN_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
            const remaining = nextFreeAt - Date.now();

            if (remaining <= 0) {
                setCountdown(null);
                setIsFree(true);
                setSpinCost(0);
                return;
            }

            const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
            const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
            const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
            const seconds = Math.floor((remaining % (60 * 1000)) / 1000);

            setCountdown({ days, hours, minutes, seconds });
        };

        computeCountdown();
        const interval = setInterval(computeCountdown, 1000);
        return () => clearInterval(interval);
    }, [isFree, gachaState?.freeSpinUsedAt]);

    const loadGachaState = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // Fetch gacha state from our data layer
            const { data, error: fetchError } = await supabase
                .from('gacha_state')
                .select('*')
                .eq('user_id', session.user.id)
                .maybeSingle();

            if (fetchError) {
                console.error('Error loading gacha state:', fetchError);
                return;
            }

            const todayStr = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'America/Argentina/Buenos_Aires'
            }).format(new Date());

            let state: GachaState;
            if (!data) {
                // Will be created on first spin
                state = {
                    id: '',
                    userId: session.user.id,
                    spinsToday: 0,
                    lastSpinDate: null,
                    freeSpinAvailable: true,
                    freeSpinUsedAt: null,
                };
            } else {
                state = {
                    id: data.id,
                    userId: data.user_id,
                    spinsToday: data.spins_today,
                    lastSpinDate: data.last_spin_date,
                    freeSpinAvailable: data.free_spin_available,
                    freeSpinUsedAt: data.free_spin_used_at,
                };
            }

            // Reset daily if needed
            let effectiveSpins = state.spinsToday;
            if (GachaEngine.shouldResetDaily(state.lastSpinDate, todayStr)) {
                effectiveSpins = 0;
            }

            // Check free spin
            const free = GachaEngine.isFreeSpin(state.freeSpinAvailable, state.freeSpinUsedAt);
            setIsFree(free);
            setSpinCost(free ? 0 : GachaEngine.calculateSpinCost(effectiveSpins));
            setGachaState({ ...state, spinsToday: effectiveSpins });
        } catch (err) {
            console.error('Error in loadGachaState:', err);
        }
    };

    const handleSpin = useCallback(async () => {
        if (phase !== 'idle' && phase !== 'result') return;
        setError(null);

        // Client-side balance check (server validates too)
        if (!isFree && currentBalance < spinCost) {
            setError(`Necesitás ${spinCost.toLocaleString()} sendas. Tenés ${Math.floor(currentBalance).toLocaleString()}.`);
            return;
        }

        setPhase('spinning');

        // Animate wheel handled by prop
        // if (wheelRef.current) { ... } logic removed

        try {
            // Call the server-side API
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setError('Sesión expirada');
                setPhase('idle');
                return;
            }

            const response = await fetch('/api/gacha/spin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Error al tirar la ruleta');
                setPhase('idle');
                return;
            }

            // Wait for wheel animation to finish
            await new Promise(resolve => setTimeout(resolve, 3200));

            setResult(data);
            setPhase('revealing');

            // Short delay before showing result
            await new Promise(resolve => setTimeout(resolve, 400));
            setPhase('result');

            // Update local state for next spin
            setSpinCost(data.nextSpinCost);
            setIsFree(false); // Free spin is consumed
            if (gachaState) {
                setGachaState({
                    ...gachaState,
                    spinsToday: gachaState.spinsToday + 1,
                    freeSpinAvailable: false,
                });
            }

        } catch (err) {
            console.error('Spin error:', err);
            setError('Error de conexión');
            setPhase('idle');
        }
    }, [phase, isFree, currentBalance, spinCost, gachaState]);

    const handleClose = () => {
        if (result) {
            onSpinComplete(); // Refresh dashboard
        }
        onClose();
        setPhase('idle');
        setResult(null);
    };

    const handleSpinAgain = () => {
        onSpinComplete(); // Refresh balance
        setPhase('idle');
        setResult(null);
        loadGachaState();
    };

    if (!isOpen) return null;

    const canAfford = isFree || currentBalance >= spinCost;

    return (
        <div className="gacha-overlay" onClick={(e) => { if (e.target === e.currentTarget && phase === 'idle') handleClose(); }}>
            <div className="gacha-modal">
                {/* Header */}
                <div className="gacha-header">
                    <h2 className="gacha-title">🎰 Ruleta</h2>
                    <p className="gacha-subtitle">Gasta tus sendas por premios y multiplicadores</p>
                    <button className="gacha-close" onClick={handleClose}>×</button>
                </div>

                {/* Balance Bar */}
                <div className="gacha-balance-bar">
                    <span className="gacha-balance-label">Tu Saldo</span>
                    <span className={`gacha-balance-value ${currentBalance < 0 ? 'negative' : ''}`}>
                        <img src="/images/senda-coin-large-sinbg.png" alt="Sendas" className="senda-floating-icon senda-floating-icon--sm" />
                        {Math.floor(result?.newBalance ?? currentBalance).toLocaleString()}
                    </span>
                </div>

                {/* Main Content */}
                {phase !== 'result' ? (
                    <div className="gacha-wheel-container">
                        {/* Wheel */}
                        <GachaWheel spinning={phase === 'spinning'} size={220} />

                        {/* Cost Display */}
                        <div className="gacha-cost-display">
                            {isFree && (
                                <div className="gacha-free-label">
                                    <Twemoji emoji="🎁" /> Tirada Gratis Semanal
                                </div>
                            )}
                            <p className="gacha-cost-amount">
                                {isFree ? (
                                    <span className="free-badge">¡GRATIS!</span>
                                ) : (
                                    <>
                                        <img src="/images/senda-coin-large-sinbg.png" alt="Sendas" className="senda-floating-icon" />
                                        {spinCost.toLocaleString()}
                                    </>
                                )}
                            </p>
                            {!isFree && (
                                <p className="gacha-cost-note">
                                    Siguiente tirada: {GachaEngine.calculateSpinCost((gachaState?.spinsToday ?? 0) + 1).toLocaleString()} sendas (+25%)
                                </p>
                            )}
                        </div>

                        {/* Free Spin Countdown */}
                        {!isFree && countdown && (
                            <div className="gacha-countdown">
                                <span className="gacha-countdown-label">Próximo giro gratis en</span>
                                <div className="gacha-countdown-timer">
                                    <div className="gacha-cd-unit">
                                        <span className="gacha-cd-value">{String(countdown.days).padStart(2, '0')}</span>
                                        <span className="gacha-cd-label">días</span>
                                    </div>
                                    <span className="gacha-cd-sep">:</span>
                                    <div className="gacha-cd-unit">
                                        <span className="gacha-cd-value">{String(countdown.hours).padStart(2, '0')}</span>
                                        <span className="gacha-cd-label">hrs</span>
                                    </div>
                                    <span className="gacha-cd-sep">:</span>
                                    <div className="gacha-cd-unit">
                                        <span className="gacha-cd-value">{String(countdown.minutes).padStart(2, '0')}</span>
                                        <span className="gacha-cd-label">min</span>
                                    </div>
                                    <span className="gacha-cd-sep">:</span>
                                    <div className="gacha-cd-unit">
                                        <span className="gacha-cd-value">{String(countdown.seconds).padStart(2, '0')}</span>
                                        <span className="gacha-cd-label">seg</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <p className="gacha-error-msg">
                                {error}
                            </p>
                        )}

                        {/* Spin Button */}
                        <button
                            className={`gacha-spin-btn ${phase === 'spinning' ? 'spinning-btn' : !canAfford ? 'disabled' : 'ready'}`}
                            onClick={handleSpin}
                            disabled={phase === 'spinning' || !canAfford}
                        >
                            {phase === 'spinning' ? '⏳ Girando...' : isFree ? '🎁 TIRAR GRATIS' : `🎰 TIRAR (${spinCost.toLocaleString()} sendas)`}
                        </button>
                    </div>
                ) : result && (
                    /* Result Display */
                    <div className="gacha-result">
                        {/* Particles for Legendary */}
                        {result.prize.rarity === 'legendary' && (
                            <div className="gacha-particles">
                                {Array.from({ length: 20 }).map((_, i) => (
                                    <div
                                        key={i}
                                        className="gacha-particle"
                                        style={{
                                            left: '50%',
                                            top: '50%',
                                            '--px': `${(Math.random() - 0.5) * 300}px`,
                                            '--py': `${(Math.random() - 0.5) * 300}px`,
                                            animationDelay: `${Math.random() * 0.5}s`,
                                            background: ['#ffd700', '#ff8c00', '#fff'][Math.floor(Math.random() * 3)],
                                        } as React.CSSProperties}
                                    />
                                ))}
                            </div>
                        )}

                        <span className={`gacha-result-rarity ${result.prize.rarity}`}>
                            {RARITY_LABELS[result.prize.rarity]}
                        </span>
                        <span className="gacha-result-emoji">
                            {RARITY_EMOJI[result.prize.rarity]}
                        </span>
                        <p className="gacha-result-label">{result.prize.label}</p>
                        <p className="gacha-result-detail">
                            {result.wasFreeSpin ? 'Tirada gratis' : `Costo: ${result.pointsSpent.toLocaleString()} sendas`}
                            {result.buffCreated && ` • Expira en ${GachaEngine.getBuffDurationHours()}h`}
                        </p>

                        {result.prize.type === 'multiplier' && (
                            <div className="multiplier-result-highlight">
                                <span className="multiplier-pulse">⚡ ACTIVO AHORA</span>
                            </div>
                        )}

                        <div className="gacha-result-actions">
                            <button className="gacha-result-btn primary" onClick={handleSpinAgain}>
                                🎰 Tirar de Nuevo
                            </button>
                            <button className="gacha-result-btn secondary" onClick={handleClose}>
                                Cerrar
                            </button>
                        </div>
                    </div>
                )}

                {/* Prize Pool Legend */}
                <div className="gacha-legend">
                    <p className="gacha-legend-title">Probabilidades</p>
                    <div className="gacha-legend-items">
                        <div className="gacha-legend-item">
                            <div className="gacha-legend-dot" style={{ background: '#a0a0a0' }} />
                            Común 54%
                        </div>
                        <div className="gacha-legend-item">
                            <div className="gacha-legend-dot" style={{ background: '#4da6ff' }} />
                            Raro 25%
                        </div>
                        <div className="gacha-legend-item">
                            <div className="gacha-legend-dot" style={{ background: '#b44dff' }} />
                            Épico 15%
                        </div>
                        <div className="gacha-legend-item">
                            <div className="gacha-legend-dot" style={{ background: '#ff6b6b' }} />
                            Troll 5%
                        </div>
                        <div className="gacha-legend-item">
                            <div className="gacha-legend-dot" style={{ background: '#ffd700' }} />
                            Legendario 1%
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
