'use client';

import { useState, useRef, useEffect } from 'react';
import { SmartNotification, NotificationType } from '@/core/types';
import { NotificationEngine } from '@/core/services/NotificationEngine';
import { SupabaseDataStore } from '@/data/supabaseData';
import ConfirmModal from './ConfirmModal';
import './NotificationCenter.css';

interface NotificationCenterProps {
    notifications: SmartNotification[];
    onRefresh: () => void;
}

function getTimeAgo(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return `hace ${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours}h`;
    const days = Math.floor(hours / 24);
    return `hace ${days}d`;
}

export default function NotificationCenter({ notifications, onRefresh }: NotificationCenterProps) {
    const [isOpen, setIsOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        isDestructive: false,
    });

    const unreadCount = notifications.filter(n => !n.isRead).length;

    // Close panel on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleMarkRead = async (id: string) => {
        await SupabaseDataStore.markNotificationRead(id);
        onRefresh();
    };

    const handleMarkAllRead = async () => {
        await SupabaseDataStore.markAllNotificationsRead();
        onRefresh();
    };

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setConfirmModal({
            isOpen: true,
            title: 'Eliminar Notificación',
            message: '¿Estás seguro de que querés eliminar esta notificación?',
            isDestructive: true,
            onConfirm: async () => {
                await SupabaseDataStore.deleteNotification(id);
                onRefresh();
            }
        });
    };

    const handleDeleteAll = () => {
        setConfirmModal({
            isOpen: true,
            title: 'Borrar Todo',
            message: '¿Estás seguro de que querés borrar todas las notificaciones? Esta acción no se puede deshacer.',
            isDestructive: true,
            onConfirm: async () => {
                await SupabaseDataStore.deleteAllNotifications();
                onRefresh();
            }
        });
    };

    const closeConfirmModal = () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
    };

    return (
        <div className="notification-center" ref={panelRef}>
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={closeConfirmModal}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                isDestructive={confirmModal.isDestructive}
                confirmText="Eliminar"
            />
            {/* Bell Button */}
            <button
                className={`notif-bell-btn ${unreadCount > 0 ? 'has-unread' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                title="Notificaciones"
            >
                <span className="bell-icon">🔔</span>
                {unreadCount > 0 && (
                    <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="notif-dropdown">
                    <div className="notif-dropdown-header">
                        <h4>Notificaciones</h4>
                        {unreadCount > 0 && (
                            <button className="mark-all-btn" onClick={handleMarkAllRead}>
                                Marcar todas leídas
                            </button>
                        )}
                        {notifications.length > 0 && (
                            <button className="delete-all-btn" onClick={handleDeleteAll} title="Borrar todas">
                                🗑️
                            </button>
                        )}
                    </div>

                    <div className="notif-list">
                        {notifications.length === 0 ? (
                            <div className="notif-empty">
                                <span className="empty-icon">✨</span>
                                <p>Sin notificaciones</p>
                            </div>
                        ) : (
                            notifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    className={`notif-item ${notif.isRead ? 'read' : 'unread'}`}
                                    onClick={() => !notif.isRead && handleMarkRead(notif.id)}
                                >
                                    <div className="notif-item-icon">
                                        {NotificationEngine.getNotificationIcon(notif.type)}
                                    </div>
                                    <div className="notif-item-content">
                                        <p className="notif-item-title">{notif.title}</p>
                                        <p className="notif-item-message">{notif.message}</p>
                                        <span className="notif-item-time">{getTimeAgo(notif.createdAt)}</span>
                                    </div>
                                    {!notif.isRead && <div className="notif-unread-dot" />}

                                    <button
                                        className="notif-delete-btn"
                                        onClick={(e) => handleDelete(e, notif.id)}
                                        title="Borrar"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
