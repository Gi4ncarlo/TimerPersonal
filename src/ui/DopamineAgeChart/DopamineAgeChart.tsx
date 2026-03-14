'use client';

import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import styles from './DopamineAgeChart.module.css';
import { useAppStore } from '@/store';

export default function DopamineAgeChart() {
    const { dopamineAgeHistory, dopamineAge, isLoadingHistory } = useAppStore();

    if (isLoadingHistory) {
        return (
            <div className={`${styles.chartWrapper} ${styles.skeleton}`}>
                <div className={styles.pulseBox}></div>
            </div>
        );
    }

    if (!dopamineAgeHistory || dopamineAgeHistory.length < 3) {
        return (
            <div className={`${styles.chartWrapper} ${styles.emptyState}`}>
                <p>Necesitas al menos 3 días de datos para ver tu evolución gráfica.</p>
                <span>¡Mantén tu constancia descubriendo tu Dopamine Age!</span>
            </div>
        );
    }

    // Determine the color of the current line based on status
    const currentStatus = dopamineAge?.status || 'warning';
    const colorMap: Record<string, string> = {
        optimal: '#00ff88',
        good: '#2b8a3e',
        warning: '#f5a623',
        critical: '#ff4444'
    };
    const activeColor = colorMap[currentStatus];

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            const ptColor = colorMap[data.status] || activeColor;
            return (
                <div className={styles.customTooltip} style={{ borderColor: ptColor }}>
                    <p className={styles.tooltipDate}>{format(parseISO(data.date), "d MMM", { locale: es })}</p>
                    <p className={styles.tooltipAge} style={{ color: ptColor }}>
                        Edad: <strong>{data.dopamineAge}</strong>
                    </p>
                    <p className={styles.tooltipStatus}>
                        {data.status.toUpperCase()}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className={styles.chartWrapper}>
            <h3 className={styles.title}>EVOLUCIÓN HISTÓRICA</h3>
            <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height={250}>
                    <LineChart
                        data={dopamineAgeHistory}
                        margin={{ top: 20, right: 20, left: -20, bottom: 0 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                        
                        <XAxis 
                            dataKey="date" 
                            tickFormatter={(validDate) => format(parseISO(validDate), 'dd/MM')} 
                            stroke="rgba(255,255,255,0.3)" 
                            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} 
                            tickMargin={10}
                            axisLine={false}
                            tickLine={false}
                        />

                        <YAxis 
                            domain={[10, 45]} 
                            stroke="rgba(255,255,255,0.3)" 
                            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} 
                            axisLine={false}
                            tickLine={false}
                        />

                        {dopamineAge?.realAge && (
                            <ReferenceLine 
                                y={dopamineAge.realAge} 
                                stroke="#888" 
                                strokeDasharray="3 3" 
                                label={{ position: 'top', value: 'Edad Real', fill: '#888', fontSize: 10 }} 
                            />
                        )}

                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
                        
                        <Line 
                            type="monotone" 
                            dataKey="dopamineAge" 
                            stroke={activeColor} 
                            strokeWidth={3} 
                            dot={{ fill: '#0a0a0a', stroke: activeColor, strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6, fill: activeColor, stroke: '#0a0a0a', strokeWidth: 2 }}
                            animationDuration={1500}
                        />

                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
