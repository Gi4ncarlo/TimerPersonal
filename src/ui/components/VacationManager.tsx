'use client';

import { useState } from 'react';
import { VacationPeriod } from '@/core/types';
import { VacationService } from '@/core/services/VacationService';
import { getTodayString } from '@/core/utils/dateUtils';
import { differenceInDays, parseISO } from 'date-fns';
import './VacationManager.css';

interface VacationManagerProps {
    periods: VacationPeriod[];
    onCreatePeriod: (startDate: string, endDate: string, reason: string) => Promise<void>;
    onDeletePeriod: (id: string) => Promise<void>;
}

export default function VacationManager({ periods, onCreatePeriod, onDeletePeriod }: VacationManagerProps) {
    const [showForm, setShowForm] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const today = getTodayString();
    const stats = VacationService.getVacationStats(periods, today);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const validation = VacationService.validatePeriod(startDate, endDate, reason, periods);
        if (!validation.valid) {
            setError(validation.error || 'Error de validación');
            return;
        }

        setIsSubmitting(true);
        try {
            await onCreatePeriod(startDate, endDate, reason);
            setStartDate('');
            setEndDate('');
            setReason('');
            setShowForm(false);
        } catch (err: any) {
            setError(err.message || 'Error al crear el período');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('¿Eliminar este período de vacaciones?')) {
            await onDeletePeriod(id);
        }
    };

    const getDurationText = () => {
        if (!startDate || !endDate) return null;
        if (endDate < startDate) return null;
        const days = differenceInDays(parseISO(endDate), parseISO(startDate)) + 1;
        const isOverLimit = days > 30;
        return (
            <p className="vacation-duration-info">
                Duración: <span className={`days-count ${isOverLimit ? 'over-limit' : ''}`}>{days} día{days !== 1 ? 's' : ''}</span>
                {isOverLimit && ' (máximo 30 días)'}
            </p>
        );
    };

    const getDaysUntil = (date: string): number => {
        return differenceInDays(parseISO(date), parseISO(today));
    };

    return (
        <div className="vacation-section">
            <div className="vacation-section-header">
                <h2 className="vacation-section-title">🏖 Bitácora de Vacaciones</h2>
                <button
                    className="vacation-toggle-btn"
                    onClick={() => setShowForm(!showForm)}
                >
                    {showForm ? '✕ Cancelar' : '+ Declarar Vacaciones'}
                </button>
            </div>

            {/* Stats Bar */}
            <div className="vacation-stats-bar">
                <div className="vacation-stat-card">
                    <span className="vacation-stat-value">{stats.daysUsedThisYear}</span>
                    <span className="vacation-stat-label">Días este año</span>
                </div>
                <div className="vacation-stat-card">
                    <span className="vacation-stat-value">{stats.periodsThisYear}</span>
                    <span className="vacation-stat-label">Períodos este año</span>
                </div>
                <div className="vacation-stat-card">
                    <span className="vacation-stat-value">{stats.totalDaysUsed}</span>
                    <span className="vacation-stat-label">Días totales</span>
                </div>
                <div className="vacation-stat-card">
                    <span className="vacation-stat-value">{stats.percentOfYear}%</span>
                    <span className="vacation-stat-label">Del año</span>
                </div>
            </div>

            {/* Next vacation countdown */}
            {stats.nextVacation && (
                <div className="vacation-next-countdown">
                    <span className="vacation-next-icon">📅</span>
                    <div className="vacation-next-info">
                        <span className="vacation-next-label">Próximas vacaciones</span>
                        <span className="vacation-next-date">
                            {stats.nextVacation.startDate} → {stats.nextVacation.endDate}
                        </span>
                    </div>
                    <span className="vacation-next-countdown-value">
                        {getDaysUntil(stats.nextVacation.startDate)}d
                    </span>
                </div>
            )}

            {/* Create Form */}
            {showForm && (
                <form className="vacation-form" onSubmit={handleSubmit}>
                    <h3 className="vacation-form-title">Nuevo Período de Vacaciones</h3>

                    {error && <div className="vacation-error">{error}</div>}

                    <div className="vacation-form-grid">
                        <div className="vacation-field">
                            <label>Fecha de inicio</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                required
                            />
                        </div>
                        <div className="vacation-field">
                            <label>Fecha de fin</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                required
                            />
                        </div>
                        <div className="vacation-field full-width">
                            <label>Motivo</label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Describe el motivo de tus vacaciones..."
                                required
                            />
                        </div>
                    </div>

                    {getDurationText()}

                    <div className="vacation-form-actions">
                        <button
                            type="button"
                            className="vacation-cancel-btn"
                            onClick={() => setShowForm(false)}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="vacation-submit-btn"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Guardando...' : 'Declarar Vacaciones'}
                        </button>
                    </div>
                </form>
            )}

            {/* Periods List */}
            <div className="vacation-list">
                {periods.length === 0 ? (
                    <div className="vacation-empty">
                        <span className="vacation-empty-icon">🏖</span>
                        <p>No hay períodos de vacaciones declarados.</p>
                        <p>Declara uno para evitar strikes durante tu ausencia.</p>
                    </div>
                ) : (
                    periods.map(period => {
                        const status = VacationService.getPeriodStatus(period, today);
                        const days = differenceInDays(parseISO(period.endDate), parseISO(period.startDate)) + 1;

                        return (
                            <div key={period.id} className={`vacation-period-card status-${status}`}>
                                <div className="vacation-period-header">
                                    <span className={`vacation-status-badge ${status}`}>
                                        {status === 'active' ? '🟢 Activo' : status === 'future' ? '🔵 Programado' : '⚪ Finalizado'}
                                    </span>
                                    <button
                                        className="vacation-delete-btn"
                                        onClick={() => handleDelete(period.id)}
                                        title="Eliminar período"
                                    >
                                        ×
                                    </button>
                                </div>
                                <div className="vacation-dates">
                                    {period.startDate}
                                    <span className="date-arrow">→</span>
                                    {period.endDate}
                                </div>
                                <p className="vacation-reason">{period.reason}</p>
                                <p className="vacation-days-count">{days} día{days !== 1 ? 's' : ''}</p>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
