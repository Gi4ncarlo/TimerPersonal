'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SupabaseDataStore } from '@/data/supabaseData';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import './analisis-ia.css';

export default function AnalisisIAPage() {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [weeklyAnalysis, setWeeklyAnalysis] = useState<string>('');
    const [recommendations, setRecommendations] = useState<string>('');
    const [error, setError] = useState<string>('');

    const handleWeeklyAnalysis = async () => {
        setIsAnalyzing(true);
        setError('');
        setWeeklyAnalysis('');
        setRecommendations('');

        try {
            // Get last 7 days of records
            const last7Days = [];
            for (let i = 6; i >= 0; i--) {
                const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
                const records = await SupabaseDataStore.getRecordsByDate(date);
                last7Days.push({ date, records });
            }

            // Create summary for AI
            const summary = last7Days.map(day => {
                const totalTime = day.records.reduce((sum, r) => sum + r.durationMinutes, 0);
                const totalPoints = day.records.reduce((sum, r) => sum + r.pointsCalculated, 0);
                const activities = day.records.map(r => `${r.actionName} (${r.notes})`).join(', ');

                return `${format(new Date(day.date), 'EEEE dd/MM', { locale: es })}: ${day.records.length} actividades - Balance: ${totalPoints} puntos - Actividades: ${activities || 'Ninguna'}`;
            }).join('\n');

            // Call API route for insights
            const analysisRes = await fetch('/api/ai/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recordsSummary: summary }),
            });

            if (!analysisRes.ok) {
                throw new Error('Error al generar análisis');
            }

            const analysisData = await analysisRes.json();
            setWeeklyAnalysis(analysisData.analysis);

            // Get recommendations
            const allRecords = await SupabaseDataStore.getRecords();
            const globalBalance = allRecords.reduce((sum, r) => sum + r.pointsCalculated, 0);
            const recentSummary = last7Days.slice(-3).map(d =>
                d.records.map(r => r.actionName).join(', ')
            ).join(' | ');

            const recsRes = await fetch('/api/ai/recommend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentBalance: globalBalance,
                    recentActivities: recentSummary
                }),
            });

            if (!recsRes.ok) {
                throw new Error('Error al generar recomendaciones');
            }

            const recsData = await recsRes.json();
            setRecommendations(recsData.recommendations);

        } catch (err: any) {
            setError(err.message || 'Error al generar el análisis. Verifica que la API key de OpenAI esté configurada correctamente en .env.local');
            console.error(err);
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <main className="analisis-page">
            <div className="analisis-container">
                <header className="analisis-header">
                    <div>
                        <h1 className="analisis-title">🤖 Análisis IA</h1>
                        <p className="analisis-subtitle">Insights y recomendaciones personalizadas</p>
                    </div>
                    <Link href="/dashboard" className="back-link">
                        ← Volver al Dashboard
                    </Link>
                </header>

                <div className="analisis-intro">
                    <h2>¿Cómo funciona?</h2>
                    <p>
                        Utilizo OpenAI GPT-4 para analizar tu historial de actividades de la última semana.
                        Te proporciono:
                    </p>
                    <ul>
                        <li>📊 <strong>Análisis de patrones</strong>: Identifico tendencias en tus hábitos</li>
                        <li>💡 <strong>Insights personalizados</strong>: Observaciones sobre tu comportamiento</li>
                        <li>🎯 <strong>Recomendaciones específicas</strong>: Sugerencias para mejorar tu balance</li>
                        <li>✨ <strong>Motivación</strong>: Feedback positivo y constructivo</li>
                    </ul>
                    <p className="note">
                        ⚠️ <strong>Importante</strong>: La IA <strong>NO puede modificar</strong> tus reglas de puntuación ni tus actividades.
                        Solo analiza datos existentes y te da su opinión.
                    </p>
                </div>

                <button
                    className="analyze-btn"
                    onClick={handleWeeklyAnalysis}
                    disabled={isAnalyzing}
                >
                    {isAnalyzing ? '🔄 Analizando...' : '🚀 Generar Análisis Semanal'}
                </button>

                {error && (
                    <div className="error-box">
                        <p>❌ {error}</p>
                    </div>
                )}

                {weeklyAnalysis && (
                    <div className="result-section">
                        <h2>📊 Análisis Semanal</h2>
                        <div className="result-content">
                            {weeklyAnalysis.split('\n').map((line, i) => (
                                <p key={i}>{line}</p>
                            ))}
                        </div>
                    </div>
                )}

                {recommendations && (
                    <div className="result-section">
                        <h2>💡 Recomendaciones Personalizadas</h2>
                        <div className="result-content recommendations">
                            {recommendations.split('\n').map((line, i) => (
                                <p key={i}>{line}</p>
                            ))}
                        </div>
                    </div>
                )}

                {!weeklyAnalysis && !isAnalyzing && !error && (
                    <div className="placeholder">
                        <p>👆 Haz clic en el botón para obtener tu análisis semanal</p>
                    </div>
                )}

                <div className="info-section">
                    <h3>¿Qué datos analiza la IA?</h3>
                    <ul>
                        <li>Últimos 7 días de actividades registradas</li>
                        <li>Balance de puntos por día</li>
                        <li>Tipos de actividades realizadas</li>
                        <li>Duración y frecuencia de cada actividad</li>
                        <li>Tu balance global acumulado</li>
                    </ul>
                </div>
            </div>
        </main>
    );
}
