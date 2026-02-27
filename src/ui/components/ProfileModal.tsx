'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SupabaseDataStore } from '@/data/supabaseData';
import { User, SarcasmLevel, LEAGUE_THRESHOLDS } from '@/core/types';
import { getLevelTitle } from '@/core/config/levelRewards';
import Avatar from './Avatar';
import { useToast } from '@/core/contexts/ToastContext';
import { Strike } from '@/core/types';
import './ProfileModal.css';
import Twemoji from './Twemoji';

const COSMETIC_AVATAR_MAP: Record<string, string> = {
    crown: '👑',
    bolt: '⚡',
    shield_avatar: '🛡️',
    fire: '🔥',
    star: '⭐',
    skull: '💀',
};

const getCosmeticEmoji = (slug: string): string => COSMETIC_AVATAR_MAP[slug] || slug;

interface ProfileModalProps {
    user: User;
    isOpen: boolean;
    isOnVacation?: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

export default function ProfileModal({ user, isOpen, isOnVacation = false, onClose, onUpdate }: ProfileModalProps) {
    const router = useRouter();
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState<'profile' | 'records' | 'settings'>('profile');
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [isZoomed, setIsZoomed] = useState(false);

    const [sarcasmLevel, setSarcasmLevel] = useState<SarcasmLevel>(
        (user.preferences?.sarcasmLevel as SarcasmLevel) || 'medium'
    );
    const [sarcasmSaving, setSarcasmSaving] = useState(false);

    // Liga Premium
    const [league, setLeague] = useState(LEAGUE_THRESHOLDS[0]);
    const [strikes, setStrikes] = useState<Strike[]>([]);

    useEffect(() => {
        if (isOpen && user?.id) {
            SupabaseDataStore.getUserBalance(user.id).then(pts => {
                const currentLeague = LEAGUE_THRESHOLDS.reduce((prev, curr) => {
                    return pts >= curr.minPoints ? curr : prev;
                });
                setLeague(currentLeague);
            });
            SupabaseDataStore.getStrikes().then(s => setStrikes(s));
        }
    }, [isOpen, user?.id]);

    const handleLogout = async () => {
        await SupabaseDataStore.logout();
        router.push('/login');
    };

    if (!isOpen) return null;



    const levelTitle = getLevelTitle(user.level);

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        const input = e.target;

        setIsUpdating(true);
        addToast('Subiendo imagen...', 'info');

        // Use setTimeout to allow the UI to repaint (show loader) before starting the heavy upload process
        setTimeout(async () => {
            try {
                const result = await SupabaseDataStore.uploadAvatar(user.id, file);

                if (result.url) {
                    await SupabaseDataStore.updateProfilePicture(user.id, result.url);
                    addToast('Foto actualizada correctamente', 'success');
                    onUpdate();
                } else {
                    addToast(result.error || 'Error al subir imagen', 'error');
                }
            } catch (error) {
                console.error(error);
                addToast('Error inesperado al subir la imagen', 'error');
            } finally {
                setIsUpdating(false);
                input.value = '';
            }
        }, 100);
    };

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newUsername && !newPassword) {
            addToast('Completa un campo para actualizar', 'warning');
            return;
        }

        if (newPassword && newPassword !== confirmPassword) {
            addToast('Las contraseñas no coinciden', 'error');
            return;
        }

        setIsUpdating(true);
        const updates: string[] = [];

        try {
            if (newUsername && newUsername.trim() !== '') {
                const result = await SupabaseDataStore.updateUsername(user.id, newUsername.trim());
                if (result.success) {
                    updates.push('nombre de usuario');
                    setNewUsername('');
                } else {
                    addToast(result.error || 'Error al actualizar usuario', 'error');
                    setIsUpdating(false);
                    return;
                }
            }

            if (newPassword && newPassword.trim() !== '') {
                const result = await SupabaseDataStore.updatePassword(newPassword);
                if (result.success) {
                    updates.push('contraseña');
                    setNewPassword('');
                    setConfirmPassword('');
                } else {
                    addToast(result.error || 'Error al actualizar contraseña', 'error');
                    setIsUpdating(false);
                    return;
                }
            }

            if (updates.length > 0) {
                addToast(`${updates.join(' y ')} actualizado(s)`, 'success');
                onUpdate();
            }
        } catch (error) {
            addToast('Error inesperado', 'error');
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
                            <div className="sidebar-avatar" style={{ position: 'relative' }}>
                                <Avatar
                                    src={user.avatarUrl}
                                    alt={user.username}
                                    fallback={user.username}
                                    size="lg"
                                />
                                {user.cosmeticAvatar && (
                                    <div className="cosmetic-badge cosmetic-badge--sm" style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
                                        <Twemoji emoji={getCosmeticEmoji(user.cosmeticAvatar)} />
                                    </div>
                                )}
                            </div>
                            <div className="sidebar-user-info">
                                <span className="sidebar-username" style={user.nameColor ? { color: user.nameColor, textShadow: `0 0 10px ${user.nameColor}40` } : {}}>{user.username}</span>
                                {user.nameTitle && <span className="sidebar-title" style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{user.nameTitle}</span>}
                                <span className="sidebar-level" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <img src={league.imgUrl} alt={league.tier} style={{ width: '20px', height: '20px', objectFit: 'contain' }} /> {league.tier}
                                </span>
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
                                        <div
                                            className="avatar-wrapper clickable-avatar"
                                            onClick={() => setIsZoomed(true)}
                                            title="Click para ampliar"
                                        >
                                            <Avatar
                                                src={user.avatarUrl}
                                                alt={user.username}
                                                fallback={user.username}
                                                size="xl"
                                            />
                                            {user.cosmeticAvatar && (
                                                <div className="cosmetic-badge cosmetic-badge--lg" style={{ position: 'absolute', top: '-16px', left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
                                                    <Twemoji emoji={getCosmeticEmoji(user.cosmeticAvatar)} />
                                                </div>
                                            )}
                                            {isUpdating && (
                                                <div className="avatar-loading-overlay">
                                                    <div className="avatar-spinner"></div>
                                                </div>
                                            )}
                                        </div>
                                        <label htmlFor="avatar-upload" className="change-avatar-label" title="Cambiar foto">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                                                <circle cx="12" cy="13" r="4"></circle>
                                            </svg>
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

                                    {/* Zoom Modal */}
                                    {isZoomed && (
                                        <div className="avatar-zoom-overlay" onClick={() => setIsZoomed(false)}>
                                            <div className="avatar-zoom-content" onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
                                                <img
                                                    src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.username}&background=random`}
                                                    alt={user.username}
                                                    className="avatar-zoomed-img"
                                                />
                                                {user.cosmeticAvatar && (
                                                    <div className="cosmetic-badge cosmetic-badge--xl" style={{ position: 'absolute', top: '-30px', left: '50%', transform: 'translateX(-50%)' }}>
                                                        <Twemoji emoji={getCosmeticEmoji(user.cosmeticAvatar)} />
                                                    </div>
                                                )}
                                                <button className="avatar-zoom-close" onClick={() => setIsZoomed(false)}>
                                                    &times;
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    <h3 className="profile-username-large" style={user.nameColor ? { color: user.nameColor, textShadow: `0 0 10px ${user.nameColor}40` } : {}}>{user.username}</h3>
                                    {user.nameTitle && <h4 style={{ color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '-10px', marginBottom: '10px' }}>{user.nameTitle}</h4>}
                                    {user.email && <p className="profile-email">{user.email}</p>}
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

                                <div className={`profile-strikes-block strikes-${strikes.length >= 5 ? 'critical' : strikes.length >= 3 ? 'danger' : strikes.length > 0 ? 'warning' : 'clean'}`}>
                                    <h4 className="strikes-block-title">
                                        Estado de Conducta
                                        <span className="strikes-count-badge">{strikes.length} STRIKES</span>
                                    </h4>
                                    <p className="strikes-block-desc">
                                        {strikes.length === 0 && '✨ Perfil limpio. Seguí manteniendo tu honor intacto y sumá sendas.'}
                                        {strikes.length > 0 && strikes.length <= 2 && '⚠️ Atención. Tenés penalizaciones leves. Intentá mejorar tu comportamiento.'}
                                        {strikes.length >= 3 && strikes.length < 5 && '🔥 Peligro. Se está aplicando una penalidad del -10% en todas tus ganancias. Tu capacidad ofensiva fue bloqueada.'}
                                        {strikes.length >= 5 && '🚨 Situación Crítica. Penalidad activa del -25% en ingresos. Comprá una amnistía urgente en la tienda.'}
                                    </p>
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
                                                    addToast(`Nivel de sarcasmo: ${opt.label}`, 'success');
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


                    </main>
                </div>
            </div>
        </div>
    );
}
