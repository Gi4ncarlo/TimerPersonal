import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import AuthProvider from '@/ui/providers/AuthProvider';
import './globals.css';

export const metadata: Metadata = {
    title: 'Senda de Logros - Forja tu Destino',
    description: 'Gamifica tu productividad y alcanza tus metas con IA',
    icons: {
        icon: '/icon.png',
        shortcut: '/icon.png',
        apple: '/icon.png',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>
                <AuthProvider>
                    {children}
                    <Toaster
                        position="top-right"
                        theme="dark"
                        richColors
                        toastOptions={{
                            style: {
                                background: 'rgba(15, 15, 35, 0.95)',
                                border: '1px solid rgba(139, 92, 246, 0.3)',
                                backdropFilter: 'blur(12px)',
                            },
                        }}
                    />
                </AuthProvider>
            </body>
        </html>
    );
}
