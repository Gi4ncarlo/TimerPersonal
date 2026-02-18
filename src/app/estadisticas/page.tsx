'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { SupabaseDataStore } from '@/data/supabaseData';
import LogoLoader from '@/ui/components/LogoLoader';
import { BalanceCalculator } from '@/core/services/BalanceCalculator';
import { StrikeDetector } from '@/core/services/StrikeDetector';
import {
    StatisticsEngine,
    CHART_COLORS,
    type DayStat,
    type KPIData,
    type ActivityDistribution,
    type TopActivity,
    type PersonalBest,
    type HourlyBucket,
    type Insight,
    type GoalCompletionData,
} from '@/core/services/StatisticsEngine';
import { format, subDays, parseISO, differenceInDays } from 'date-fns';
import { getArgentinaDate } from '@/core/utils/dateUtils';
import { es } from 'date-fns/locale';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
    Area, AreaChart, ComposedChart, ReferenceLine,
} from 'recharts';
import type { Goal } from '@/core/types';
import Navbar from '@/ui/components/Navbar';
import ProfileModal from '@/ui/components/ProfileModal';
import { User, VacationPeriod } from '@/core/types';
import { VacationService } from '@/core/services/VacationService';
import './estadisticas.css';

// ─── Time Range Options ──────────────────────────
type TimeRange = 7 | 30 | 0; // 0 = all history
const RANGE_OPTIONS: { label: string; value: TimeRange }[] = [
    { label: '7 días', value: 7 },
    { label: '30 días', value: 30 },
    { label: 'General', value: 0 },
];

// ─── Custom Tooltip ──────────────────────────────
// ─── Custom Tooltip ──────────────────────────────
// ─── Custom Tooltip ──────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;

    // Check if it's the Balance Chart (AreaChart) by looking at the dataKey of the first item
    const firstItem = payload[0];
    if (firstItem.dataKey === 'Puntos') {
        return (
            <div className="custom-tooltip">
                <p className="tooltip-label">{label}</p>
                <div className="tooltip-value" style={{ color: firstItem.value >= 0 ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                    ⚡ Balance: {firstItem.value > 0 ? '+' : ''}{firstItem.value} pts
                </div>
            </div>
        );
    }

    // Extract the full data entry for Breakdown Chart
    const dataEntry = firstItem.payload;

    // Filter keys that start with __event_ (our hidden events)
    const eventKeys = Object.keys(dataEntry).filter(k => k.startsWith('__event_'));

    return (
        <div className="custom-tooltip">
            <p className="tooltip-label">{label}</p>
            {/* Standard Bars (Hours) */}
            {payload.map((p: any, i: number) => {
                // Skip the Line chart "totalPoints" from this list
                if (p.dataKey === 'totalPoints') return null;

                return (
                    <p key={i} className="tooltip-value" style={{ color: p.color }}>
                        {p.name}: {p.value}h
                    </p>
                );
            })}

            {/* Visual Separator if we have events */}
            {eventKeys.length > 0 && <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '4px 0', paddingTop: '4px' }} />}

            {/* Hidden Events (Points) */}
            {eventKeys.map((k) => {
                const name = k.replace('__event_', '');
                const value = dataEntry[k];
                const isStrike = name.toLowerCase().includes('strike');
                const color = isStrike ? '#ef4444' : '#fbbf24'; // Red for strike, Amber for bonus
                const icon = isStrike ? '⛔' : '🎉';

                return (
                    <p key={k} className="tooltip-value" style={{ color: color }}>
                        {icon} {name}: {value > 0 ? '+' : ''}{value} pts
                    </p>
                );
            })}

            {/* Total Points Context */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '4px 0', paddingTop: '4px' }}>
                <div className="tooltip-value" style={{ color: '#fbbf24', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>⚡ Puntos Netos:</span>
                    <span>{dataEntry.totalPoints > 0 ? '+' : ''}{dataEntry.totalPoints} pts</span>
                </div>
            </div>
        </div>
    );
}

// ─── Sparkline component ─────────────────────────
function Sparkline({ data, color = '#8b5cf6' }: { data: number[]; color?: string }) {
    const sparkData = data.map((v, i) => ({ v, i }));
    return (
        <ResponsiveContainer width="100%" height={40}>
            <AreaChart data={sparkData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                <defs>
                    <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <Area
                    type="monotone"
                    dataKey="v"
                    stroke={color}
                    strokeWidth={1.5}
                    fill={`url(#spark-${color.replace('#', '')})`}
                    dot={false}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}

// ─── Circular Progress ───────────────────────────
function CircularProgress({ percentage, size = 120, strokeWidth = 10 }: {
    percentage: number;
    size?: number;
    strokeWidth?: number;
}) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <svg width={size} height={size} className="circular-progress">
            <circle className="progress-bg" cx={size / 2} cy={size / 2} r={radius}
                strokeWidth={strokeWidth} fill="none" />
            <circle className="progress-fill" cx={size / 2} cy={size / 2} r={radius}
                strokeWidth={strokeWidth} fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`} />
            <text x="50%" y="50%" textAnchor="middle" dy="0.35em" className="progress-text">
                {percentage}%
            </text>
        </svg>
    );
}

// ═══════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════
export default function EstadisticasPage() {
    const [allStats, setAllStats] = useState<DayStat[]>([]);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [range, setRange] = useState<TimeRange>(30);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isOnVacation, setIsOnVacation] = useState(false);

    // ── Data Loading ─────────────────────────────
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const user = await SupabaseDataStore.getCurrentUser();
            setCurrentUser(user);
            const nowArg = getArgentinaDate();
            const todayStr = format(nowArg, 'yyyy-MM-dd');

            // Fetch ALL records (no date limit) so historical data is never lost
            const [allRecords, goalsData, strikes] = await Promise.all([
                SupabaseDataStore.getRecords(),
                SupabaseDataStore.getGoals(),
                SupabaseDataStore.getStrikes(),
            ]);

            // Convert strikes to "virtual" records
            const strikeRecords = strikes.map(s => ({
                id: `strike-${s.id}`,
                actionId: 'strike',
                actionName: '⛔ Strike',
                date: s.strikeDate,
                timestamp: s.detectedAt,
                durationMinutes: 0,
                metricValue: 0,
                pointsCalculated: -(s.pointsDeducted || 0),
                notes: s.reason,
            }));

            const combinedRecords = [...allRecords, ...strikeRecords];

            // Group records by date
            const recordsByDate = combinedRecords.reduce((acc, record) => {
                if (!acc[record.date]) acc[record.date] = [];
                acc[record.date].push(record);
                return acc;
            }, {} as Record<string, any[]>);

            // Find the earliest record date to generate the full range
            const allDates = Object.keys(recordsByDate).sort();
            const earliestDate = allDates.length > 0 ? allDates[0] : todayStr;
            const totalDays = differenceInDays(parseISO(todayStr), parseISO(earliestDate));

            // Generate day stats from earliest record date to today
            const statsData: DayStat[] = [];
            for (let i = totalDays; i >= 0; i--) {
                const date = format(subDays(nowArg, i), 'yyyy-MM-dd');
                const dayRecords = recordsByDate[date] || [];
                const balance = BalanceCalculator.getDailyBalance(dayRecords, parseISO(date));

                const activityBreakdown: Record<string, number> = {};
                dayRecords.forEach((r: any) => {
                    activityBreakdown[r.actionName] = (activityBreakdown[r.actionName] || 0) + r.durationMinutes;
                });

                const mainActivity =
                    (Object.entries(activityBreakdown) as [string, number][])
                        // Sort by absolute value of points to find the most impactful activity
                        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0]?.[0] || 'Sin actividad';

                statsData.push({
                    date,
                    dateFormatted: format(parseISO(date), 'dd/MM', { locale: es }),
                    totalPoints: balance.totalPoints,
                    totalMinutes: balance.timeGainedMinutes,
                    isPositive: balance.totalPoints >= 0,
                    mainActivity,
                    records: dayRecords,
                    activityBreakdown,
                });
            }

            setAllStats(statsData);
            setGoals(goalsData);

            // Vacation status for Navbar
            const vacations = await SupabaseDataStore.getVacationPeriods();
            const activeVacation = VacationService.getActiveVacation(vacations, todayStr);
            setIsOnVacation(!!activeVacation);
        } catch (error) {
            console.error('Error loading stats:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // ── Filtered stats by selected range ─────────
    // range=0 means "General" (all history), otherwise last N days
    const stats = useMemo(() => range === 0 ? allStats : allStats.slice(-range), [allStats, range]);
    const records = useMemo(() => stats.flatMap(s => s.records), [stats]);

    // ── Computed data (memoized) ─────────────────
    const kpis = useMemo(() => StatisticsEngine.computeKPIs(stats, records), [stats, records]);
    const activityDist = useMemo(() => StatisticsEngine.computeActivityDistribution(records), [records]);
    const dailyBreakdown = useMemo(() => StatisticsEngine.computeDailyBreakdown(stats), [stats]);
    const topActivities = useMemo(() => StatisticsEngine.computeTopActivities(records), [records]);
    const personalBests = useMemo(() => StatisticsEngine.computePersonalBests(stats, records), [stats, records]);
    const hourlyDist = useMemo(() => StatisticsEngine.computeHourlyDistribution(records), [records]);
    const heatmapData = useMemo(() => StatisticsEngine.computeHeatmapData(stats), [stats]);
    const goalCompletion = useMemo(() => StatisticsEngine.computeGoalCompletion(goals), [goals]);

    const activityStreaks = useMemo(() => StrikeDetector.calculateActivityStreaks(records), [records]);
    const comparison = useMemo(() => StrikeDetector.getWeeklyComparison(records), [records]);
    const insights = useMemo(() => StatisticsEngine.generateInsights(stats, records, activityStreaks), [stats, records, activityStreaks]);

    // ── Line chart data ──────────────────────────
    const lineChartData = useMemo(() =>
        stats.map(s => {
            const dateObj = parseISO(s.date);
            const dayName = format(dateObj, 'EEE', { locale: es }).replace('.', '');
            const dayDate = format(dateObj, 'dd/MM');
            const fechaFormatted = `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${dayDate}`;

            return {
                fecha: fechaFormatted,
                Puntos: Math.floor(s.totalPoints)
            };
        })
        , [stats]);

    // Calculate Gradient Offset for AreaChart (Split Color)
    const gradientOffset = () => {
        const dataMax = Math.max(...lineChartData.map((i) => i.Puntos));
        const dataMin = Math.min(...lineChartData.map((i) => i.Puntos));

        if (dataMax <= 0) {
            return 0;
        }
        if (dataMin >= 0) {
            return 1;
        }

        return dataMax / (dataMax - dataMin);
    };

    const off = gradientOffset();

    // ── Feedback ─────────────────────────────────
    const feedback = useMemo(() => {
        if (comparison.difference > 0) {
            if (comparison.percent > 50) return {
                icon: '🚀', class: 'awesome',
                text: `¡Brutal! Rendís un ${Math.round(comparison.percent)}% mejor que la semana pasada. ¡Seguí así!`,
            };
            return {
                icon: '📈', class: 'good',
                text: `Vas por buen camino. ${Math.floor(comparison.difference)} puntos más que la semana pasada.`,
            };
        }
        if (comparison.difference < 0) return {
            icon: '⚠️', class: 'warning',
            text: `Venís un ${Math.round(Math.abs(comparison.percent))}% más bajo que la semana pasada. ¡Todavía hay tiempo!`,
        };
        return { icon: '✨', class: 'neutral', text: 'Mantené la constancia para alcanzar tus objetivos.' };
    }, [comparison]);

    // ── Selected day detail ──────────────────────
    const selectedDayData = selectedDate ? stats.find(s => s.date === selectedDate) : null;

    if (isLoading) {
        return <LogoLoader />;
    }

    return (
        <main className="estadisticas-page">
            <div className="stats-container">
                <Navbar
                    currentUser={currentUser}
                    userLevel={currentUser ? { level: currentUser.level, xp: currentUser.xp } : undefined}
                    isOnVacation={isOnVacation}
                    onProfileClick={() => setIsProfileModalOpen(true)}
                />

                {/* ═══ HEADER + RANGE SELECTOR ═══ */}
                <header className="stats-header">
                    <div>
                        <h1 className="stats-title">📊 Estadísticas</h1>
                        <p className="stats-subtitle">Centro de análisis y progreso personal</p>
                    </div>
                    <div className="header-actions">
                        <div className="range-selector">
                            {RANGE_OPTIONS.map(opt => (
                                <button key={opt.value}
                                    className={`range-btn ${range === opt.value ? 'active' : ''}`}
                                    onClick={() => setRange(opt.value)}>
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </header>

                {/* ═══ SMART INSIGHTS ═══ */}
                {insights.length > 0 && (
                    <div className="insights-row">
                        {insights.map((ins, i) => (
                            <div key={i} className={`insight-chip ${ins.type}`}>
                                <span className="insight-icon">{ins.icon}</span>
                                <span className="insight-text">{ins.text}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* ═══ KPI CARDS WITH SPARKLINES ═══ */}
                <div className="kpi-grid">
                    {kpis.map((kpi, i) => (
                        <div key={i} className="kpi-card">
                            <div className="kpi-header">
                                <span className="kpi-icon">{kpi.icon}</span>
                                <span className="kpi-label">{kpi.label}</span>
                            </div>
                            <div className="kpi-value-row">
                                <span className="kpi-value">{kpi.value.toLocaleString()}</span>
                                <span className="kpi-unit">{kpi.unit}</span>
                            </div>
                            {kpi.change !== 0 && (
                                <span className={`kpi-change ${kpi.change >= 0 ? 'pos' : 'neg'}`}>
                                    {kpi.change >= 0 ? '↑' : '↓'} {Math.abs(kpi.change)}%
                                </span>
                            )}
                            <div className="kpi-sparkline">
                                <Sparkline data={kpi.sparkline} color={CHART_COLORS[i % CHART_COLORS.length]} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* ═══ FEEDBACK CARD ═══ */}
                <div className={`feedback-card ${feedback.class}`}>
                    <div className="feedback-icon">{feedback.icon}</div>
                    <div className="feedback-content">
                        <h3>Análisis Semanal</h3>
                        <p>{feedback.text}</p>
                    </div>
                    <div className="feedback-stats">
                        <div className="fb-stat">
                            <span className="fb-val">{Math.floor(comparison.thisWeekPoints)}</span>
                            <span className="fb-lbl">Esta semana</span>
                        </div>
                        <div className="fb-stat">
                            <span className="fb-val">{Math.floor(comparison.lastWeekPoints)}</span>
                            <span className="fb-lbl">Semana anterior</span>
                        </div>
                    </div>
                </div>

                {/* ═══ CHARTS ROW 1: PIE + STACKED BAR ═══ */}
                <div className="charts-row-2col">
                    {/* Pie Chart */}
                    <div className="chart-card">
                        <h3>🥧 Distribución de Actividades</h3>
                        {activityDist.length > 0 ? (
                            <div className="pie-chart-container">
                                <ResponsiveContainer width="100%" height={260}>
                                    <PieChart>
                                        <Pie data={activityDist} dataKey="hours" nameKey="name"
                                            cx="50%" cy="50%" outerRadius={90} innerRadius={50}
                                            paddingAngle={2} strokeWidth={0}>
                                            {activityDist.map((entry, idx) => (
                                                <Cell key={idx} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="pie-legend">
                                    {activityDist.map((a, i) => (
                                        <div key={i} className="pie-legend-item">
                                            <span className="legend-dot" style={{ background: a.color }} />
                                            <span className="legend-name">{a.name}</span>
                                            <span className="legend-pct">{a.hours}h ({a.percentage}%)</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <p className="no-data-msg">Sin datos suficientes para este período</p>
                        )}
                    </div>

                    {/* Stacked Bar Chart */}
                    <div className="chart-card">
                        <h3>📊 Desglose Diario (Horas + Puntos)</h3>
                        {dailyBreakdown.data.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <ComposedChart data={dailyBreakdown.data}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                    <XAxis dataKey="fecha" stroke="#6b7280" tick={{ fontSize: 9 }}
                                        interval="preserveStartEnd" />

                                    {/* Left Axis: Hours */}
                                    <YAxis yAxisId="left" stroke="#6b7280" tick={{ fontSize: 10 }} unit="h" />

                                    {/* Right Axis: Points */}
                                    <YAxis yAxisId="right" orientation="right" stroke="#fbbf24" tick={{ fontSize: 10 }} />

                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend wrapperStyle={{ fontSize: 11 }} />

                                    {/* Bars for Activities (Hours) */}
                                    {dailyBreakdown.activities.slice(0, 12).map((act, i) => (
                                        <Bar key={act} dataKey={act} stackId="a" yAxisId="left"
                                            fill={CHART_COLORS[i % CHART_COLORS.length]}
                                            radius={[2, 2, 0, 0]} />
                                    ))}

                                    {/* Line for Points */}
                                    <Line type="monotone" dataKey="totalPoints" yAxisId="right"
                                        stroke="#fbbf24" strokeWidth={2} dot={{ r: 3 }} name="Puntos Netos" />

                                </ComposedChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="no-data-msg">Sin datos suficientes para este período</p>
                        )}
                    </div>
                </div>

                {/* ═══ HEATMAP ═══ */}
                <div className="chart-card heatmap-section">
                    <div className="section-header-row">
                        <h3>📅 Mapa de Actividad</h3>
                        <div className="heatmap-legend">
                            <span className="legend-text">Menos</span>
                            <span className="hm-cell level-0" />
                            <span className="hm-cell level-1" />
                            <span className="hm-cell level-2" />
                            <span className="hm-cell level-3" />
                            <span className="hm-cell level-4" />
                            <span className="legend-text">Más</span>
                        </div>
                    </div>
                    <div className="heatmap-grid">
                        {heatmapData.cells.map((cell, i) => (
                            <div key={i}
                                className={`hm-cell level-${cell.level < 0 ? 'neg' : cell.level} ${selectedDate === cell.date ? 'selected' : ''}`}
                                title={`${cell.formatted}: ${cell.points} pts (${cell.activities} act.)`}
                                onClick={() => setSelectedDate(cell.date === selectedDate ? null : cell.date)}>
                                <span className="hm-date">{cell.formatted}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ═══ CHARTS ROW 2: LINE + HOURLY ═══ */}
                <div className="charts-row-2col">
                    {/* Line Chart */}
                    <div className="chart-card">
                        <h3>📈 Balance Diario</h3>
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={lineChartData}>
                                <defs>
                                    <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset={off} stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset={off} stopColor="#ef4444" stopOpacity={0.3} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                                <XAxis dataKey="fecha" stroke="#6b7280" tick={{ fontSize: 10 }} minTickGap={30} />
                                <YAxis stroke="#6b7280" tick={{ fontSize: 10 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="Puntos" strokeWidth={2}
                                    stroke="#8b5cf6"
                                    fill="url(#splitColor)" dot={false} activeDot={{ r: 5, fill: '#8b5cf6' }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Hourly Distribution */}
                    <div className="chart-card">
                        <h3>⏰ Distribución Horaria</h3>
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={hourlyDist}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                <XAxis dataKey="label" stroke="#6b7280" tick={{ fontSize: 9 }} interval={2} />
                                <YAxis stroke="#6b7280" tick={{ fontSize: 10 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="count" name="Actividades" fill="#06b6d4" radius={[3, 3, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* ═══ BOTTOM ROW: TOP 5 | PERSONAL BESTS | GOAL COMPLETION ═══ */}
                <div className="stats-bottom-grid">
                    {/* Top 5 Activities */}
                    <div className="chart-card">
                        <h3>🏅 Top Actividades</h3>
                        <div className="top-activities-list">
                            {topActivities.length > 0 ? topActivities.map((act, i) => (
                                <div key={i} className="top-activity-item">
                                    <div className="top-activity-rank">#{i + 1}</div>
                                    <div className="top-activity-info">
                                        <span className="top-activity-name">{act.name}</span>
                                        <div className="top-activity-bar-container">
                                            <div className="top-activity-bar"
                                                style={{
                                                    width: `${act.percentage}%`,
                                                    background: CHART_COLORS[i % CHART_COLORS.length],
                                                }} />
                                        </div>
                                    </div>
                                    <div className="top-activity-meta">
                                        <span className="meta-count">{act.count}×</span>
                                        <span className="meta-pts">{Math.floor(act.totalPoints)} pts</span>
                                    </div>
                                </div>
                            )) : (
                                <p className="no-data-msg">Sin actividades registradas</p>
                            )}
                        </div>
                    </div>

                    {/* Personal Bests */}
                    <div className="chart-card">
                        <h3>🏆 Records Personales</h3>
                        <div className="personal-bests-grid">
                            {personalBests.length > 0 ? personalBests.map((pb, i) => (
                                <div key={i} className="pb-card">
                                    <span className="pb-icon">{pb.icon}</span>
                                    <div className="pb-info">
                                        <span className="pb-label">{pb.label}</span>
                                        <span className="pb-value">{pb.value}</span>
                                        <span className="pb-detail">{pb.detail}</span>
                                    </div>
                                </div>
                            )) : (
                                <p className="no-data-msg">Aún no hay records</p>
                            )}
                        </div>
                    </div>

                    {/* Goal Completion */}
                    <div className="chart-card goal-completion-card">
                        <h3>🎯 Objetivos</h3>
                        {goalCompletion.total > 0 ? (
                            <div className="goal-completion-content">
                                <CircularProgress percentage={goalCompletion.percentage} />
                                <div className="goal-stats-text">
                                    <span className="goal-fraction">
                                        {goalCompletion.completed}/{goalCompletion.total}
                                    </span>
                                    <span className="goal-label">completados</span>
                                </div>
                                <div className="goal-list-mini">
                                    {goalCompletion.goals.slice(0, 4).map((g, i) => (
                                        <div key={i} className={`goal-item-mini ${g.done ? 'done' : ''}`}>
                                            <span className="goal-check">{g.done ? '✅' : '⬜'}</span>
                                            <span className="goal-name">{g.title}</span>
                                            <span className="goal-progress">
                                                {Math.min(Math.round((g.progress / g.target) * 100), 100)}%
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="no-goals-container">
                                <p className="no-data-msg">No tenés objetivos activos.</p>
                                <Link href="/dashboard" className="add-goal-link">+ Crear Objetivo</Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* ═══ SELECTED DAY DETAIL ═══ */}
                {selectedDayData && (
                    <div className="day-detail animate-slide-up">
                        <div className="day-detail-header">
                            <h2 className="detail-title">
                                {format(parseISO(selectedDayData.date), "EEEE, dd 'de' MMMM", { locale: es })}
                            </h2>
                            <button className="close-detail" onClick={() => setSelectedDate(null)}>✕</button>
                        </div>
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
                                        {record.notes && <p className="detail-record-notes">{record.notes}</p>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {currentUser && (
                <ProfileModal
                    user={currentUser}
                    isOpen={isProfileModalOpen}
                    onClose={() => setIsProfileModalOpen(false)}
                    onUpdate={() => loadData()}
                />
            )}
        </main>
    );
}
