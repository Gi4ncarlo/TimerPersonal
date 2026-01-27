'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SupabaseDataStore } from '@/data/supabaseData';
import { BalanceCalculator } from '@/core/services/BalanceCalculator';
import { format, subDays, parseISO } from 'date-fns';
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
            const startDate = format(subDays(new Date(), 59), 'yyyy-MM-dd');
            const endDate = format(new Date(), 'yyyy-MM-dd');

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
                const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
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
    const globalBalance = allRecords.reduce((sum, r) => sum + r.pointsCalculated, 0);
    const totalDaysWithActivity = stats.filter(s => s.records.length > 0).length;
    const positiveDays = stats.filter(s => s.isPositive && s.records.length > 0).length;

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

                {/* Global Stats */}
                <div className="global-stats">
                    <div className="stat-box">
                        <span className="stat-label">Balance Global (60d)</span>
                        <span className={`stat-big ${globalBalance >= 0 ? 'positive' : 'negative'}`}>
                            {globalBalance >= 0 ? '+' : ''}{Math.floor(globalBalance)} pts
                        </span>
                    </div>
                    <div className="stat-box">
                        <span className="stat-label">Días Activos</span>
                        <span className="stat-big">{totalDaysWithActivity}/60</span>
                    </div>
                    <div className="stat-box">
                        <span className="stat-label">Días Positivos</span>
                        <span className="stat-big positive">{positiveDays}/{totalDaysWithActivity}</span>
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
