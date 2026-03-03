'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { SupabaseDataStore } from '@/data/supabaseData';
import { WeeklySummaryEngine } from '@/core/services/WeeklySummaryEngine';
import { WeeklySummary } from '@/core/types';
import WeeklySummaryModal from '@/ui/components/WeeklySummaryModal';
import Navbar from '@/ui/components/Navbar';
import LogoLoader from '@/ui/components/LogoLoader';
import Twemoji from '@/ui/components/Twemoji';
import { getTodayString, getWeekStartString, getArgentinaDate } from '@/core/utils/dateUtils';
import './historial-semanal.css';

const formatDateRange = (start: string, end: string) => {
    const s = new Date(start + 'T12:00:00');
    const e = new Date(end + 'T12:00:00');
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    return `${s.toLocaleDateString('es-AR', opts)} — ${e.toLocaleDateString('es-AR', opts)}`;
};

export default function HistorialSemanal() {
    const router = useRouter();
    const [summaries, setSummaries] = useState<WeeklySummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);

    // Modal state
    const [selectedSummary, setSelectedSummary] = useState<WeeklySummary | null>(null);
    const [previousForSelected, setPreviousForSelected] = useState<WeeklySummary | null>(null);
    const [showModal, setShowModal] = useState(false);

    // Comparison state
    const [compareMode, setCompareMode] = useState(false);
    const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
    const [showCompare, setShowCompare] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        const userData = await SupabaseDataStore.getCurrentUser();
        setCurrentUser(userData);

        const allSummaries = await SupabaseDataStore.getAllWeeklySummaries(user.id);
        setSummaries(allSummaries);
        setLoading(false);
    };

    const handleOpenDetail = (summary: WeeklySummary) => {
        const idx = summaries.findIndex(s => s.weekStart === summary.weekStart);
        const prev = idx < summaries.length - 1 ? summaries[idx + 1] : null;
        setSelectedSummary(summary);
        setPreviousForSelected(prev);
        setShowModal(true);
    };

    const toggleCompareSelect = (id: string) => {
        setSelectedForCompare(prev => {
            if (prev.includes(id)) return prev.filter(x => x !== id);
            if (prev.length >= 2) return [prev[1], id];
            return [...prev, id];
        });
    };

    const handleCompare = () => {
        if (selectedForCompare.length === 2) setShowCompare(true);
    };

    const compA = summaries.find(s => s.id === selectedForCompare[0]);
    const compB = summaries.find(s => s.id === selectedForCompare[1]);

    if (loading) return <LogoLoader />;

    return (
        <main className="hs-page">
            <Navbar currentUser={currentUser} />

            <div className="hs-container">
                <div className="hs-header">
                    <h1 className="hs-title">Historial Semanal</h1>
                    <p className="hs-subtitle">Revisá tu progreso semana a semana</p>
                    <div className="hs-actions">
                        <button
                            className={`hs-compare-toggle ${compareMode ? 'active' : ''}`}
                            onClick={() => { setCompareMode(!compareMode); setSelectedForCompare([]); setShowCompare(false); }}
                        >
                            {compareMode ? '✕ Cancelar' : '⚖️ Comparar semanas'}
                        </button>
                        {compareMode && selectedForCompare.length === 2 && (
                            <button className="hs-compare-btn" onClick={handleCompare}>
                                Comparar ({selectedForCompare.length}/2)
                            </button>
                        )}
                    </div>
                </div>

                {summaries.length === 0 ? (
                    <div className="hs-empty">
                        <span className="hs-empty-icon">📭</span>
                        <p>Todavía no tenés semanas registradas.</p>
                        <p className="hs-empty-hint">Tu primer resumen aparecerá automáticamente el próximo lunes.</p>
                    </div>
                ) : (
                    <div className="hs-weeks-grid">
                        {summaries.map((summary, idx) => {
                            const prev = idx < summaries.length - 1 ? summaries[idx + 1] : null;
                            const pointsDiff = prev ? summary.totalPoints - prev.totalPoints : 0;
                            const isSelected = selectedForCompare.includes(summary.id);

                            return (
                                <div
                                    key={summary.id}
                                    className={`hs-week-card ${isSelected ? 'selected' : ''}`}
                                    onClick={() => compareMode ? toggleCompareSelect(summary.id) : handleOpenDetail(summary)}
                                >
                                    {compareMode && (
                                        <div className={`hs-check ${isSelected ? 'checked' : ''}`}>
                                            {isSelected ? '✓' : ''}
                                        </div>
                                    )}
                                    <div className="hs-week-dates">{formatDateRange(summary.weekStart, summary.weekEnd)}</div>
                                    <div className="hs-week-stats">
                                        <div className="hs-week-stat">
                                            <span className="hs-stat-icon"><Twemoji emoji="🏆" /></span>
                                            <span className="hs-stat-val">{summary.totalPoints.toLocaleString('es-AR')}</span>
                                            <span className="hs-stat-lbl">pts</span>
                                            {prev && (
                                                <span className={`hs-diff ${pointsDiff >= 0 ? 'up' : 'down'}`}>
                                                    {pointsDiff >= 0 ? '↑' : '↓'} {Math.abs(pointsDiff).toLocaleString('es-AR')}
                                                </span>
                                            )}
                                        </div>
                                        <div className="hs-week-stat">
                                            <span className="hs-stat-icon"><Twemoji emoji="📋" /></span>
                                            <span className="hs-stat-val">{summary.totalActivities}</span>
                                            <span className="hs-stat-lbl">actividades</span>
                                        </div>
                                        <div className="hs-week-stat">
                                            <span className="hs-stat-icon"><Twemoji emoji="⚡" /></span>
                                            <span className="hs-stat-val">{summary.totalStrikes}</span>
                                            <span className="hs-stat-lbl">strikes</span>
                                        </div>
                                    </div>
                                    {summary.bestDayName && (
                                        <div className="hs-week-best">
                                            Mejor día: <strong>{summary.bestDayName}</strong> ({summary.bestDayPoints} pts)
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Comparison Side-by-Side View */}
                {showCompare && compA && compB && (
                    <div className="hs-compare-overlay" onClick={() => setShowCompare(false)}>
                        <div className="hs-compare-panel" onClick={e => e.stopPropagation()}>
                            <h2 className="hs-compare-title">Comparativa</h2>
                            <div className="hs-compare-grid">
                                <div className="hs-compare-col header">
                                    <span>Métrica</span>
                                </div>
                                <div className="hs-compare-col">
                                    <span>{formatDateRange(compA.weekStart, compA.weekEnd)}</span>
                                </div>
                                <div className="hs-compare-col">
                                    <span>{formatDateRange(compB.weekStart, compB.weekEnd)}</span>
                                </div>

                                {[
                                    { label: 'Puntos', a: compA.totalPoints, b: compB.totalPoints, fmt: (v: number) => v.toLocaleString('es-AR') },
                                    { label: 'Actividades', a: compA.totalActivities, b: compB.totalActivities, fmt: String },
                                    { label: 'Strikes', a: compA.totalStrikes, b: compB.totalStrikes, fmt: String, invert: true },
                                    { label: 'Mejor día (pts)', a: compA.bestDayPoints, b: compB.bestDayPoints, fmt: String },
                                    { label: 'Ranking', a: compA.leaderboardPosition || 0, b: compB.leaderboardPosition || 0, fmt: (v: number) => v ? `#${v}` : '—', invert: true },
                                ].map(row => {
                                    const dir = row.invert
                                        ? WeeklySummaryEngine.getMetricComparison(row.b, row.a)
                                        : WeeklySummaryEngine.getMetricComparison(row.a, row.b);
                                    return (
                                        <>
                                            <div className="hs-compare-col header" key={row.label + '-label'}>{row.label}</div>
                                            <div className={`hs-compare-col ${dir === 'up' ? 'winner' : ''}`} key={row.label + '-a'}>{row.fmt(row.a)}</div>
                                            <div className={`hs-compare-col ${dir === 'down' ? 'winner' : ''}`} key={row.label + '-b'}>{row.fmt(row.b)}</div>
                                        </>
                                    );
                                })}

                                <div className="hs-compare-col header">Actividad frecuente</div>
                                <div className="hs-compare-col">{compA.mostFrequentAction || '—'} (×{compA.mostFrequentCount})</div>
                                <div className="hs-compare-col">{compB.mostFrequentAction || '—'} (×{compB.mostFrequentCount})</div>

                                <div className="hs-compare-col header">Mejor día</div>
                                <div className="hs-compare-col">{compA.bestDayName || '—'}</div>
                                <div className="hs-compare-col">{compB.bestDayName || '—'}</div>
                            </div>
                            <button className="hs-compare-close" onClick={() => setShowCompare(false)}>Cerrar</button>
                        </div>
                    </div>
                )}
            </div>

            {showModal && selectedSummary && (
                <WeeklySummaryModal
                    summary={selectedSummary}
                    previousSummary={previousForSelected}
                    onClose={() => setShowModal(false)}
                />
            )}
        </main>
    );
}
