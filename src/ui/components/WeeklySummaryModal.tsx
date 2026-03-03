'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { WeeklySummary } from '@/core/types';
import { WeeklySummaryEngine } from '@/core/services/WeeklySummaryEngine';
import Twemoji from './Twemoji';
import './WeeklySummaryModal.css';

interface WeeklySummaryModalProps {
    summary: WeeklySummary;
    previousSummary: WeeklySummary | null;
    onClose: () => void;
}

const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
};

const ComparisonArrow = ({ direction }: { direction: 'up' | 'same' | 'down' }) => {
    if (direction === 'up') return <span className="ws-arrow ws-arrow-up">↑</span>;
    if (direction === 'down') return <span className="ws-arrow ws-arrow-down">↓</span>;
    return <span className="ws-arrow ws-arrow-same">→</span>;
};

export default function WeeklySummaryModal({ summary, previousSummary, onClose }: WeeklySummaryModalProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 50);
        return () => clearTimeout(timer);
    }, []);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 400);
    };

    const message = WeeklySummaryEngine.getComparisonMessage(summary, previousSummary);

    // Chart data
    const dayOrder = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const chartData = dayOrder.map(day => ({
        name: day,
        puntos: summary.dailyBreakdown[day] || 0,
    }));
    const maxDay = chartData.reduce((max, d) => d.puntos > max.puntos ? d : max, chartData[0]);

    // Map short day names to dates for strike detection
    const getStrikeDayNames = (): Set<string> => {
        const shortNames = new Set<string>();
        for (const dateStr of summary.strikeDays) {
            const d = new Date(dateStr + 'T12:00:00');
            const dayIdx = d.getDay();
            const names = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
            shortNames.add(names[dayIdx]);
        }
        return shortNames;
    };
    const strikeDayNames = getStrikeDayNames();

    // Stat cards
    const stats = [
        { emoji: '🏆', label: 'Puntos', value: summary.totalPoints.toLocaleString('es-AR'), comp: previousSummary ? WeeklySummaryEngine.getMetricComparison(summary.totalPoints, previousSummary.totalPoints) : null },
        { emoji: '📋', label: 'Actividades', value: String(summary.totalActivities), comp: previousSummary ? WeeklySummaryEngine.getMetricComparison(summary.totalActivities, previousSummary.totalActivities) : null },
        { emoji: '⚡', label: 'Strikes', value: String(summary.totalStrikes), comp: previousSummary ? WeeklySummaryEngine.getMetricComparison(previousSummary.totalStrikes, summary.totalStrikes) : null }, // Inverted: fewer is better
        { emoji: '📅', label: 'Mejor día', value: summary.bestDayName ? `${summary.bestDayName} (${summary.bestDayPoints})` : '—', comp: previousSummary ? WeeklySummaryEngine.getMetricComparison(summary.bestDayPoints, previousSummary.bestDayPoints) : null },
        { emoji: '🔁', label: 'Más frecuente', value: summary.mostFrequentAction ? `${summary.mostFrequentAction} (×${summary.mostFrequentCount})` : '—', comp: null },
        { emoji: '🏅', label: 'Ranking', value: summary.leaderboardPosition ? `#${summary.leaderboardPosition}` : '—', comp: previousSummary?.leaderboardPosition ? WeeklySummaryEngine.getMetricComparison(previousSummary.leaderboardPosition, summary.leaderboardPosition!) : null }, // Inverted: lower rank is better
    ];

    return (
        <div className={`ws-overlay ${isVisible ? 'active' : ''}`} onClick={handleClose}>
            <div className="ws-modal" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="ws-header">
                    <h2 className="ws-title">Tu semana del {formatDate(summary.weekStart)} al {formatDate(summary.weekEnd)}</h2>
                    <p className="ws-message">{message}</p>
                </div>

                {/* Stats Grid */}
                <div className="ws-stats-grid">
                    {stats.map((stat, i) => (
                        <div key={i} className="ws-stat-card">
                            <div className="ws-stat-emoji"><Twemoji emoji={stat.emoji} /></div>
                            <div className="ws-stat-info">
                                <span className="ws-stat-label">{stat.label}</span>
                                <span className="ws-stat-value">{stat.value}</span>
                            </div>
                            {stat.comp && <ComparisonArrow direction={stat.comp} />}
                            {!stat.comp && previousSummary === null && <span className="ws-first-week">1ª</span>}
                        </div>
                    ))}
                </div>

                {/* Chart */}
                <div className="ws-chart-section">
                    <h3 className="ws-section-title">Puntos por Día</h3>
                    <div className="ws-chart-container">
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={chartData} barCategoryGap="20%">
                                <XAxis
                                    dataKey="name"
                                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis hide />
                                <Tooltip
                                    contentStyle={{
                                        background: 'rgba(15, 15, 35, 0.95)',
                                        border: '1px solid rgba(139, 92, 246, 0.3)',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '13px',
                                    }}
                                    itemStyle={{ color: '#fff' }}
                                    labelStyle={{ color: '#a78bfa', fontWeight: 'bold', marginBottom: '4px' }}
                                    formatter={(value: number) => [`${value.toLocaleString('es-AR')} pts`, 'Puntos']}
                                />
                                <Bar dataKey="puntos" radius={[6, 6, 0, 0]}>
                                    {chartData.map((entry, idx) => (
                                        <Cell
                                            key={idx}
                                            fill={entry.name === maxDay.name && entry.puntos > 0
                                                ? '#a78bfa'
                                                : 'rgba(139, 92, 246, 0.35)'}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>

                        {/* Strike indicators below chart */}
                        <div className="ws-strike-row">
                            {dayOrder.map(day => (
                                <div key={day} className="ws-strike-cell">
                                    {strikeDayNames.has(day) && <Twemoji emoji="🔥" />}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* CTA */}
                <button className="ws-cta-btn" onClick={handleClose}>
                    ¡A por esta semana!
                </button>
            </div>
        </div>
    );
}
