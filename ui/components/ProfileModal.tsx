'use client';

import { useState } from 'react';
import { SupabaseDataStore } from '@/data/supabaseData';
import { User } from '@/core/types';
import './ProfileModal.css';

interface ProfileModalProps {
    user: User;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

export default function ProfileModal({ user, isOpen, onClose, onUpdate }: ProfileModalProps) {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    if (!isOpen) return null;

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        setIsUpdating(true);
        const file = e.target.files[0];

        try {
            const result = await SupabaseDataStore.uploadAvatar(user.id, file);
            if (result.url) {
                await SupabaseDataStore.updateProfilePicture(user.id, result.url);
                setMessage({ text: 'Foto actualizada correctamente', type: 'success' });
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

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setMessage({ text: 'Las contraseñas no coinciden', type: 'error' });
            return;
        }

        setIsUpdating(true);
        try {
            const result = await SupabaseDataStore.updatePassword(newPassword);
            if (result.success) {
                setMessage({ text: 'Contraseña actualizada', type: 'success' });
                setNewPassword('');
                setConfirmPassword('');
            } else {
                setMessage({ text: result.error || 'Error al actualizar', type: 'error' });
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
                        <label htmlFor="avatar-upload" className="change-avatar-label">
                            📷
                        </label>
                        <input
                            id="avatar-upload"
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handleAvatarChange}
                        />
                    </div>

                    <h2 className="profile-username">{user.username}</h2>
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
                            <span className="stat-val">{user.xp}</span>
                        </div>
                    </div>

                    <div className="password-section">
                        <h3>Cambiar Contraseña</h3>
                        <form className="password-form" onSubmit={handlePasswordUpdate}>
                            <div className="input-group">
                                <label>Nueva Contraseña</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <label>Confirmar Contraseña</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                            <button className="update-pw-btn" disabled={isUpdating}>
                                {isUpdating ? 'Actualizando...' : 'Guardar Cambios'}
                            </button>
                        </form>
                    </div>

                    {message.text && (
                        <p className={`msg-${message.type}`}>{message.text}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
