import React from 'react';
import './ConfirmModal.css';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
}

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    isDestructive = false
}: ConfirmModalProps) {
    if (!isOpen) return null;

    return (
        <div className="confirm-modal-overlay" onClick={onClose}>
            <div className="confirm-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="confirm-modal-header">
                    <h3>{title}</h3>
                    <button className="confirm-modal-close" onClick={onClose}>×</button>
                </div>

                <div className="confirm-modal-body">
                    <p>{message}</p>
                </div>

                <div className="confirm-modal-actions">
                    <button className="btn-cancel" onClick={onClose}>
                        {cancelText}
                    </button>
                    <button
                        className={`btn-confirm ${isDestructive ? 'destructive' : ''}`}
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
