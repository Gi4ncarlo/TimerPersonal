'use client';

import { useState } from 'react';
import { SupabaseDataStore } from '@/data/supabaseData';
import { User } from '@/core/types';
import { getLevelTitle } from '@/core/config/levelRewards';
import './ProfileModal.css';

interface ProfileModalProps {
    user: User;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

export default function ProfileModal({ user, isOpen, onClose, onUpdate }: ProfileModalProps) {
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

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
                <header className="profile-header">
                    <button className="close-profile-btn" onClick={onClose}>✕</button>

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

                    <h2 className="profile-username">{user.username}</h2>
                    <p className="profile-rank">{levelTitle}</p>
                    <p className="profile-email">{sessionStorage.getItem('currentUserEmail') || 'Usuario Antigravity'}</p>
                </header>

                <div className="profile-body">
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
                        <h3>Configuración de Perfil</h3>
                        <p className="section-description">Actualiza solo los campos que deseas cambiar</p>

                        <form className="profile-form" onSubmit={handleProfileUpdate}>
                            <div className="input-group">
                                <label>Nuevo Nombre de Usuario</label>
                                <input
                                    type="text"
                                    value={newUsername}
                                    onChange={e => setNewUsername(e.target.value)}
                                    placeholder={user.username}
                                    disabled={isUpdating}
                                    minLength={3}
                                    maxLength={20}
                                />
                                <span className="input-hint">Opcional - Déjalo vacío para mantener el actual</span>
                            </div>

                            <div className="input-group">
                                <label>Nueva Contraseña</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    placeholder="••••••••"
                                    disabled={isUpdating}
                                    minLength={6}
                                />
                                <span className="input-hint">Opcional - Mínimo 6 caracteres</span>
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

                    {message.text && (
                        <div className={`profile-message msg-${message.type}`}>
                            {message.text}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
