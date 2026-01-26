import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'Quest Tracker - Level Up Your Time',
    description: 'Gamified time tracking with AI-powered insights',
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
