'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SupabaseDataStore } from '@/data/supabaseData';
import { Action, User, ActionType } from '@/core/types';
import Twemoji from '@/ui/components/Twemoji';
import './admin.css';

export default function AdminPanel() {
    const router = useRouter();
    const [globalActions, setGlobalActions] = useState<Action[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState('');

    // Form state for new action
    const [newName, setNewName] = useState('');
    const [newType, setNewType] = useState<ActionType>('positive');
    const [newPoints, setNewPoints] = useState(0);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const user = await SupabaseDataStore.getCurrentUser();
            if (!user || user.role !== 'admin') {
                router.push('/dashboard');
                return;
            }
            setCurrentUser(user);

            const allActions = await SupabaseDataStore.getActions();
            // Filter global actions (userId is null)
            const globals = allActions.filter(a => !a.userId);
            setGlobalActions(globals);
        } catch (error) {
            console.error('Error loading admin data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdatePoints = async (id: string, name: string, points: number, type: ActionType) => {
        setIsSaving(id);
        setSuccessMsg('');
        try {
            await SupabaseDataStore.updateAction(id, { name, pointsPerMinute: points, type });
            setSuccessMsg('Actualizado correctamente');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (error) {
            alert('Error al actualizar');
        } finally {
            setIsSaving(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Seguro que quieres eliminar esta actividad global? Esto afectará a TODOS los usuarios.')) return;
        try {
            await SupabaseDataStore.deleteAction(id);
            setGlobalActions(prev => prev.filter(a => a.id !== id));
        } catch (error) {
            alert('Error al eliminar');
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const newActionRaw = {
                name: newName,
                type: newType,
                pointsPerMinute: newPoints,
                metadata: { inputType: 'time' as const, unit: 'minutos' }
            };
            await SupabaseDataStore.createAction(newActionRaw);
            setNewName('');
            setNewPoints(0);
            loadData();
            setSuccessMsg('Añadida nueva actividad global');
        } catch (error) {
            alert('Error al crear');
        }
    };

    if (isLoading) return <div className="loading">Cargando Panel...</div>;

    return (
        <main className="admin-panel">
            <div className="admin-container">
                <header className="admin-header">
                    <div>
                        <h1 className="admin-title">Panel de Administración</h1>
                        <p style={{ color: 'var(--color-text-muted)' }}>Gestiona los puntos globales de la aplicación</p>
                    </div>
                    <Link href="/dashboard" className="nav-link">← Volver al Panel</Link>
                </header>

                <div className="admin-card">
                    <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: 'var(--space-md)' }}>Catálogo Global de Actividades</h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-lg)' }}>
                        Cualquier cambio aquí se reflejará inmediatamente para todos los usuarios actuales y futuros.
                    </p>

                    <table className="actions-table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Tipo</th>
                                <th>Puntos / Min</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {globalActions.map(action => (
                                <tr key={action.id} className="action-row">
                                    <td>
                                        <input
                                            type="text"
                                            className="form-control"
                                            style={{ background: 'transparent', border: 'none', padding: 0 }}
                                            defaultValue={action.name}
                                            onBlur={(e) => handleUpdatePoints(action.id, e.target.value, action.pointsPerMinute, action.type)}
                                        />
                                    </td>
                                    <td>
                                        <span className={`badge ${action.type === 'positive' ? 'badge-positive' : 'badge-negative'}`}>
                                            {action.type === 'positive' ? 'Positiva' : 'Negativa'}
                                        </span>
                                    </td>
                                    <td>
                                        <input
                                            type="number"
                                            className="points-input"
                                            defaultValue={action.pointsPerMinute}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                // We update local state or just handle on Blur?
                                                // For speed, let's keep it simple.
                                            }}
                                            onBlur={(e) => handleUpdatePoints(action.id, action.name, parseFloat(e.target.value), action.type)}
                                        />
                                    </td>
                                    <td style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                        {isSaving === action.id ? (
                                            <span style={{ fontSize: '0.7rem' }}>Guardando...</span>
                                        ) : (
                                            <button className="admin-btn btn-delete" onClick={() => handleDelete(action.id)}>
                                                <Twemoji emoji="🗑️" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {successMsg && <p className="success-msg">{successMsg}</p>}
                </div>

                <div className="admin-card">
                    <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 'var(--space-lg)' }}>Crear Nueva Actividad Global</h3>
                    <form onSubmit={handleCreate} className="new-action-form">
                        <div className="form-group">
                            <label>Nombre de la Actividad</label>
                            <input
                                type="text"
                                className="form-control"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                placeholder="Ej: Meditar"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Tipo</label>
                            <select
                                className="form-control"
                                value={newType}
                                onChange={e => setNewType(e.target.value as ActionType)}
                            >
                                <option value="positive">Positiva</option>
                                <option value="negative">Negativa</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Puntos / Min</label>
                            <input
                                type="number"
                                className="form-control"
                                value={newPoints}
                                onChange={e => setNewPoints(parseFloat(e.target.value))}
                                step="0.1"
                                required
                            />
                        </div>
                        <button type="submit" className="admin-btn btn-save" style={{ padding: 'var(--space-sm) var(--space-xl)' }}>
                            Añadir Actividad
                        </button>
                    </form>
                </div>
            </div>
        </main>
    );
}
