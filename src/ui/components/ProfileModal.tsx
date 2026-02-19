'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SupabaseDataStore } from '@/data/supabaseData';
import { User, SarcasmLevel } from '@/core/types';
import { getLevelTitle } from '@/core/config/levelRewards';
import './ProfileModal.css';

interface ProfileModalProps {
    user: User;
    isOpen: boolean;
    isOnVacation?: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

export default function ProfileModal({ user, isOpen, isOnVacation = false, onClose, onUpdate }: ProfileModalProps) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'profile' | 'records' | 'settings'>('profile');
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [sarcasmLevel, setSarcasmLevel] = useState<SarcasmLevel>(
        (user.preferences?.sarcasmLevel as SarcasmLevel) || 'medium'
    );
    const [sarcasmSaving, setSarcasmSaving] = useState(false);

    const handleLogout = async () => {
        await SupabaseDataStore.logout();
        router.push('/login');
    };

    if (!isOpen) return null;

    const levelTitle = getLevelTitle(user.level);

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        setIsUpdating(true);
        setMessage({ text: '', type: '' });
        const file = e.target.files[0];

        try {
            const result = await SupabaseDataStore.uploadAvatar(user.id, file);
            if (result.url) {
                await SupabaseDataStore.updateProfilePicture(user.id, result.url);
                setMessage({ text: '✓ Foto actualizada correctamente', type: 'success' });
                onUpdate();
            } else {
                setMessage({ text: result.error || 'Error al subir imagen', type: 'error' });
            }
        } catch (error) {
            setMessage({ text: 'Error inesperado', type: 'error' });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate that at least one field is filled
        if (!newUsername && !newPassword) {
            setMessage({ text: 'Debes completar al menos un campo para actualizar', type: 'error' });
            return;
        }

        // Validate password match if password is provided
        if (newPassword && newPassword !== confirmPassword) {
            setMessage({ text: 'Las contraseñas no coinciden', type: 'error' });
            return;
        }

        setIsUpdating(true);
        setMessage({ text: '', type: '' });
        const updates: string[] = [];

        try {
            // Update username if provided
            if (newUsername && newUsername.trim() !== '') {
                const result = await SupabaseDataStore.updateUsername(user.id, newUsername.trim());
                if (result.success) {
                    updates.push('nombre de usuario');
                    setNewUsername('');
                } else {
                    setMessage({ text: result.error || 'Error al actualizar usuario', type: 'error' });
                    setIsUpdating(false);
                    return;
                }
            }

            // Update password if provided
            if (newPassword && newPassword.trim() !== '') {
                const result = await SupabaseDataStore.updatePassword(newPassword);
                if (result.success) {
                    updates.push('contraseña');
                    setNewPassword('');
                    setConfirmPassword('');
                } else {
                    setMessage({ text: result.error || 'Error al actualizar contraseña', type: 'error' });
                    setIsUpdating(false);
                    return;
                }
            }

            if (updates.length > 0) {
                setMessage({
                    text: `✓ ${updates.join(' y ')} actualizado${updates.length > 1 ? 's' : ''}`,
                    type: 'success'
                });
                onUpdate();
            }
        } catch (error) {
            setMessage({ text: 'Error inesperado', type: 'error' });
        } finally {
            setIsUpdating(false);
        }
    };



    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="profile-modal" onClick={e => e.stopPropagation()}>
                <div className="profile-layout">
                    {/* Sidebar / Topbar Navigation */}
                    <nav className="profile-sidebar">
                        <div className="profile-sidebar-header">
                            <div className="sidebar-avatar">
                                {user.avatarUrl ? (
                                    <img src={user.avatarUrl} alt="Avatar" />
                                ) : (
                                    <div className="sidebar-avatar-placeholder">{user.username.charAt(0).toUpperCase()}</div>
                                )}
                            </div>
                            <div className="sidebar-user-info">
                                <span className="sidebar-username">{user.username}</span>
                                <span className="sidebar-level">{levelTitle}</span>
                            </div>
                        </div>

                        <div className="profile-nav-items">
                            <button
                                className={`profile-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
                                onClick={() => setActiveTab('profile')}
                            >
                                <span className="nav-icon">👤</span>
                                <span className="nav-label">Perfil</span>
                            </button>
                            <button
                                className={`profile-nav-item ${activeTab === 'records' ? 'active' : ''}`}
                                onClick={() => setActiveTab('records')}
                            >
                                <span className="nav-icon">📂</span>
                                <span className="nav-label">Registros</span>
                            </button>
                            <button
                                className={`profile-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
                                onClick={() => setActiveTab('settings')}
                            >
                                <span className="nav-icon">⚙️</span>
                                <span className="nav-label">Ajustes</span>
                            </button>
                        </div>

                        <button className="profile-logout-btn-sidebar" onClick={handleLogout}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                <polyline points="16 17 21 12 16 7" />
                                <line x1="21" y1="12" x2="9" y2="12" />
                            </svg>
                            <span className="nav-label">Salir</span>
                        </button>
                    </nav>

                    {/* Main Content Area */}
                    <main className="profile-content">
                        <button className="close-profile-btn" onClick={onClose}>✕</button>

                        {/* TAB: PROFILE */}
                        {activeTab === 'profile' && (
                            <div className="tab-content fade-in">
                                <header className="tab-header">
                                    <h2>Tu Perfil</h2>
                                    <div className={`profile-status-badge ${isOnVacation ? 'on-vacation' : 'active'}`}>
                                        <span className="status-dot"></span>
                                        {isOnVacation ? 'DE VACACIONES' : 'SISTEMAS ACTIVOS'}
                                    </div>
                                </header>

                                <div className="avatar-section-large">
                                    <div className="avatar-container">
                                        {user.avatarUrl ? (
                                            <img src={user.avatarUrl} alt="Avatar" className="profile-avatar" />
                                        ) : (
                                            <div className="avatar-placeholder">{user.username.charAt(0).toUpperCase()}</div>
                                        )}
                                        <label htmlFor="avatar-upload" className="change-avatar-label" title="Cambiar foto">
                                            📷
                                        </label>
                                        <input
                                            id="avatar-upload"
                                            type="file"
                                            accept="image/*"
                                            style={{ display: 'none' }}
                                            onChange={handleAvatarChange}
                                            disabled={isUpdating}
                                        />
                                    </div>
                                    <p className="profile-email">{sessionStorage.getItem('currentUserEmail') || 'Usuario Antigravity'}</p>
                                </div>

                                <div className="profile-stats-row">
                                    <div className="profile-stat-item">
                                        <span className="stat-lbl">Nivel</span>
                                        <span className="stat-val">{user.level}</span>
                                    </div>
                                    <div className="profile-stat-item">
                                        <span className="stat-lbl">XP Total</span>
                                        <span className="stat-val">{user.xp.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="profile-settings-section">
                                    <h3>Editar Datos</h3>
                                    <form className="profile-form" onSubmit={handleProfileUpdate}>
                                        <div className="input-group">
                                            <label>Nombre de Usuario</label>
                                            <input
                                                type="text"
                                                value={newUsername}
                                                onChange={e => setNewUsername(e.target.value)}
                                                placeholder={user.username}
                                                disabled={isUpdating}
                                                minLength={3}
                                                maxLength={20}
                                            />
                                        </div>

                                        <div className="input-group">
                                            <label>Contraseña</label>
                                            <input
                                                type="password"
                                                value={newPassword}
                                                onChange={e => setNewPassword(e.target.value)}
                                                placeholder="••••••••"
                                                disabled={isUpdating}
                                                minLength={6}
                                            />
                                        </div>

                                        {newPassword && (
                                            <div className="input-group">
                                                <label>Confirmar Contraseña</label>
                                                <input
                                                    type="password"
                                                    value={confirmPassword}
                                                    onChange={e => setConfirmPassword(e.target.value)}
                                                    placeholder="••••••••"
                                                    disabled={isUpdating}
                                                />
                                            </div>
                                        )}

                                        <button className="update-profile-btn" type="submit" disabled={isUpdating}>
                                            {isUpdating ? 'Guardando...' : 'Guardar Cambios'}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* TAB: RECORDS */}
                        {activeTab === 'records' && (
                            <div className="tab-content fade-in">
                                <header className="tab-header">
                                    <h2>Registros</h2>
                                    <p className="tab-subtitle">Historial de actividad y sanciones</p>
                                </header>

                                <div className="records-grid">
                                    <button
                                        className="record-card"
                                        onClick={() => {
                                            onClose();
                                            router.push('/vacaciones');
                                        }}
                                    >
                                        <div className="record-icon">📒</div>
                                        <div className="record-info">
                                            <h3>Bitácora de Vacaciones</h3>
                                            <p>Gestioná tus días libres y licencias.</p>
                                        </div>
                                        <span className="record-arrow">→</span>
                                    </button>

                                    <button
                                        className="record-card"
                                        onClick={() => {
                                            onClose();
                                            router.push('/strikes');
                                        }}
                                    >
                                        <div className="record-icon">⚠️</div>
                                        <div className="record-info">
                                            <h3>Historial de Strikes</h3>
                                            <p>Revisá tus faltas y el estado de tu cuenta.</p>
                                        </div>
                                        <span className="record-arrow">→</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* TAB: SETTINGS */}
                        {activeTab === 'settings' && (
                            <div className="tab-content fade-in">
                                <header className="tab-header">
                                    <h2>Configuración</h2>
                                    <p className="tab-subtitle">Personalizá tu experiencia</p>
                                </header>

                                <div className="profile-settings-section">
                                    <h3>🔔 Nivel de Sarcasmo</h3>
                                    <p className="section-description">Elegí qué tan brutales querés que sean las notificaciones</p>

                                    <div className="sarcasm-selector">
                                        {[
                                            { value: 'low' as SarcasmLevel, label: '🙂 Suave', desc: 'Mensajes amables y motivadores' },
                                            { value: 'medium' as SarcasmLevel, label: '😏 Medio', desc: 'Con algo de humor y presión' },
                                            { value: 'brutal' as SarcasmLevel, label: '🔥 Brutal', desc: 'Sin filtro, máximo sarcasmo' },
                                        ].map(opt => (
                                            <button
                                                key={opt.value}
                                                className={`sarcasm-btn ${sarcasmLevel === opt.value ? 'active' : ''} sarcasm-${opt.value}`}
                                                disabled={sarcasmSaving}
                                                onClick={async () => {
                                                    setSarcasmLevel(opt.value);
                                                    setSarcasmSaving(true);
                                                    await SupabaseDataStore.updateSarcasmLevel(user.id, opt.value);
                                                    setSarcasmSaving(false);
                                                    setMessage({ text: `✓ Nivel de sarcasmo: ${opt.label}`, type: 'success' });
                                                    onUpdate();
                                                }}
                                            >
                                                <span className="sarcasm-label">{opt.label}</span>
                                                <span className="sarcasm-desc">{opt.desc}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {message.text && (
                            <div className={`profile-message msg-${message.type}`}>
                                {message.text}
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}
