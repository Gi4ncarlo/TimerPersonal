'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
    const router = useRouter();

    useEffect(() => {
        // Check if user is logged in
        const user = typeof window !== 'undefined'
            ? sessionStorage.getItem('currentUser')
            : null;

        if (user) {
            router.push('/dashboard');
        } else {
            router.push('/login');
        }
    }, [router]);

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-secondary)'
        }}>
            <p>Cargando...</p>
        </div>
    );
}
