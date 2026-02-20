'use client';

import Toast, { ToastType } from './Toast';
import { ToastMessage } from '@/core/contexts/ToastContext';
import './Toast.css';

interface ToastContainerProps {
    toasts: ToastMessage[];
    removeToast: (id: string) => void;
}

export default function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
    return (
        <div className="toast-container-fixed">
            {toasts.map((toast) => (
                <Toast
                    key={toast.id}
                    id={toast.id}
                    message={toast.message}
                    type={toast.type}
                    duration={toast.duration}
                    onClose={removeToast}
                />
            ))}
        </div>
    );
}
