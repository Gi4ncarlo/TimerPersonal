'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SupabaseDataStore } from '@/data/supabaseData';
import { BalanceCalculator } from '@/core/services/BalanceCalculator';
import { StrikeDetector } from '@/core/services/StrikeDetector';
import { format, subDays, parseISO, startOfWeek } from 'date-fns';
import { getArgentinaDate, getTodayString } from '@/core/utils/dateUtils';
import { es } from 'date-fns/locale';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './estadisticas.css';

export default function EstadisticasPage() {
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [stats, setStats] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const [isExpanded, setIsExpanded] = useState(false);

    const loadStats = async () => {
        try {
            // OPTIMIZATION: Fetch ALL records at once instead of 60 individual queries
            const nowArg = getArgentinaDate();
            const startDate = format(subDays(nowArg, 59), 'yyyy-MM-dd');
            const endDate = format(nowArg, 'yyyy-MM-dd');

            const allRecords = await SupabaseDataStore.getRecordsByDateRange(startDate, endDate);

            // Group by date
            const recordsByDate = allRecords.reduce((acc, record) => {
                if (!acc[record.date]) {
                    acc[record.date] = [];
                }
                acc[record.date].push(record);
                return acc;
            }, {} as Record<string, any[]>);

            // Generate stats for last 60 days
            const statsData = [];
            for (let i = 59; i >= 0; i--) {
                const date = format(subDays(nowArg, i), 'yyyy-MM-dd');
                const dayRecords = recordsByDate[date] || [];
                const balance = BalanceCalculator.getDailyBalance(dayRecords, parseISO(date));

                const activityTime = dayRecords.reduce((acc, r) => {
                    acc[r.actionName] = (acc[r.actionName] || 0) + r.durationMinutes;
                    return acc;
                }, {} as Record<string, number>);

                const mainActivity =
                    (Object.entries(activityTime) as [string, number][])
                        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Sin actividad';


                statsData.push({
                    date,
                    dateFormatted: format(parseISO(date), 'dd/MM', { locale: es }),
                    totalPoints: balance.totalPoints,
                    totalMinutes: balance.timeGainedMinutes,
                    isPositive: balance.totalPoints >= 0,
                    mainActivity,
                    records: dayRecords,
                });
            }

            setStats(statsData);
        } catch (error) {
            console.error('Error loading stats:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-text-secondary)'
            }}>
                <p>Cargando estadísticas...</p>
            </div>
        );
    }

    const selectedDayData = selectedDate ? stats.find(s => s.date === selectedDate) : null;

    // Sort reverse for history view (newest first)
    const historyData = [...stats].reverse();
    const visibleHistory = isExpanded ? historyData : historyData.slice(0, 7);

    // Prepare chart data with actual values
    const chartData = stats.map(s => ({
        fecha: s.dateFormatted,
        'Puntos': Math.floor(s.totalPoints),
    }));

    // Calculate global stats from all records
    const allRecords = stats.flatMap(s => s.records);
    const globalPoints = allRecords.reduce((sum, r) => sum + r.pointsCalculated, 0);
    const totalDaysWithActivity = stats.filter(s => s.records.length > 0).length;

    // Streaks calculation using StrikeDetector
    const activityStreaks = StrikeDetector.calculateActivityStreaks(allRecords);

    // Weekly comparison
    const comparison = StrikeDetector.getWeeklyComparison(allRecords);

    // Feedback logic
    const getFeedback = () => {
        if (comparison.difference > 0) {
            if (comparison.percent > 50) return {
                icon: '🚀',
                text: `¡Brutal! Estás rindiendo un ${Math.round(comparison.percent)}% mejor que la semana pasada. ¡Forja tu destino!`,
                class: 'awesome'
            };
            return {
                icon: '📈',
                text: `Vas por buen camino. Tenés un balance de ${Math.floor(comparison.difference)} puntos más que la semana pasada.`,
                class: 'good'
            };
        } else if (comparison.difference < 0) {
            return {
                icon: '⚠️',
                text: `Esta semana venís un poco más flojo (${Math.round(Math.abs(comparison.percent))}% menos). ¡Todavía hay tiempo de remontar!`,
                class: 'warning'
            };
        }
        return { icon: '✨', text: 'Mantén la constancia para alcanzar tus objetivos semanales.', class: 'neutral' };
    };

    const feedback = getFeedback();

    // Get top 3 activity streaks
    const topStreaks = Object.entries(activityStreaks)
        .filter(([_, s]) => s.current > 1)
        .sort((a, b) => b[1].current - a[1].current)
        .slice(0, 3);

    return (
        <main className="estadisticas-page">
            <div className="stats-container">
                <header className="stats-header">
                    <div>
                        <h1 className="stats-title">📊 Estadísticas</h1>
                        <p className="stats-subtitle">Análisis de actividad y progreso</p>
                    </div>
                    <Link href="/dashboard" className="back-link">
                        ← Volver al Dashboard
                    </Link>
                </header>

                {/* Dynamic Feedback */}
                <div className={`feedback-card ${feedback.class}`}>
                    <div className="feedback-icon">{feedback.icon}</div>
                    <div className="feedback-content">
                        <h3>Análisis de Rendimiento</h3>
                        <p>{feedback.text}</p>
                    </div>
                </div>

                {/* Main Stats Grid */}
                <div className="stats-main-grid">
                    {/* Comparison Box */}
                    <div className="stat-box-new comparison">
                        <span className="stat-label">Rendimiento Semanal</span>
                        <div className="stat-value-container">
                            <span className="stat-big-new">
                                {comparison.thisWeekPoints >= 0 ? '+' : ''}{Math.floor(comparison.thisWeekPoints)}
                            </span>
                            <span className={`stat-change ${comparison.difference >= 0 ? 'pos' : 'neg'}`}>
                                {comparison.difference >= 0 ? '↑' : '↓'} {Math.round(Math.abs(comparison.percent))}%
                            </span>
                        </div>
                        <span className="stat-subtext">vs semana pasada ({Math.floor(comparison.lastWeekPoints)} pts)</span>
                    </div>

                    {/* Streak Box */}
                    <div className="stat-box-new streaks">
                        <span className="stat-label">Rachas Activas</span>
                        <div className="streaks-list">
                            {topStreaks.length > 0 ? (
                                topStreaks.map(([name, s]) => (
                                    <div key={name} className="streak-item-mini">
                                        <span className="streak-name">{name}</span>
                                        <span className="streak-count">🔥 {s.current} días</span>
                                    </div>
                                ))
                            ) : (
                                <p className="no-streaks">Registrá la misma actividad 2 días seguidos para iniciar una racha.</p>
                            )}
                        </div>
                    </div>

                    <div className="stat-box-new total">
                        <span className="stat-label">Puntos Totales (60d)</span>
                        <span className={`stat-big-new ${globalPoints >= 0 ? 'positive' : 'negative'}`}>
                            {globalPoints >= 0 ? '+' : ''}{Math.floor(globalPoints)}
                        </span>
                        <span className="stat-subtext">{totalDaysWithActivity} días con actividad</span>
                    </div>
                </div>

                {/* Charts */}
                <div className="charts-section">
                    <div className="chart-card">
                        <h3>Balance Diario (Puntos)</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis
                                    dataKey="fecha"
                                    stroke="#b8c5d6"
                                    tick={{ fontSize: 10 }}
                                    interval="preserveStartEnd"
                                />
                                <YAxis stroke="#b8c5d6" />
                                <Tooltip
                                    contentStyle={{ background: '#111a45', border: '1px solid #00d4ff' }}
                                    labelStyle={{ color: '#00d4ff' }}
                                />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="Puntos"
                                    stroke="#00d4ff"
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Calendar View */}
                <div className="calendar-section">
                    <div className="section-header-row">
                        <h2 className="section-title">Historial Reciente</h2>
                        <button
                            className="toggle-history-btn"
                            onClick={() => setIsExpanded(!isExpanded)}
                        >
                            {isExpanded ? 'Ver menos (7 días)' : 'Ver historial completo (60 días)'}
                        </button>
                    </div>

                    <div className="calendar-grid">
                        {visibleHistory.map((day) => (
                            <div
                                key={day.date}
                                className={`calendar-day ${day.isPositive ? 'positive-day' : 'negative-day'} ${selectedDate === day.date ? 'selected' : ''
                                    } ${day.records.length === 0 ? 'empty-day' : ''}`}
                                onClick={() => setSelectedDate(day.date === selectedDate ? null : day.date)}
                            >
                                <div className="day-date-small">{format(parseISO(day.date), 'dd/MM')}</div>
                                <div className="day-main-activity">{day.mainActivity}</div>
                                <div className={`day-points ${day.totalPoints >= 0 ? 'pos' : 'neg'}`}>
                                    {day.totalPoints > 0 ? '+' : ''}{Math.floor(day.totalPoints)} pts
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Selected Day Detail */}
                {selectedDayData && (
                    <div className="day-detail">
                        <h2 className="detail-title">
                            Detalle: {format(parseISO(selectedDayData.date), "EEEE, dd 'de' MMMM", { locale: es })}
                        </h2>
                        <div className="detail-summary">
                            <span className={`detail-balance ${selectedDayData.isPositive ? 'positive' : 'negative'}`}>
                                Balance: {selectedDayData.isPositive ? '+' : ''}
                                {Math.floor(selectedDayData.totalPoints)} pts
                            </span>
                            <span className="detail-count">{selectedDayData.records.length} actividades</span>
                        </div>

                        {selectedDayData.records.length === 0 ? (
                            <p className="no-activity">Sin actividades registradas este día</p>
                        ) : (
                            <div className="detail-records">
                                {selectedDayData.records.map((record: any) => (
                                    <div key={record.id} className="detail-record">
                                        <div className="detail-record-header">
                                            <strong>{record.actionName}</strong>
                                            <span className={record.pointsCalculated >= 0 ? 'positive' : 'negative'}>
                                                {record.pointsCalculated >= 0 ? '+' : ''}
                                                {Math.floor(record.pointsCalculated)} pts
                                            </span>
                                        </div>
                                        <p className="detail-record-notes">{record.notes}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}
