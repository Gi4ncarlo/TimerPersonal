import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'Senda de Logros - Forja tu Destino',
    description: 'Gamifica tu productividad y alcanza tus metas con IA',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
