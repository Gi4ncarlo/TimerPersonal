'use client';

import { useState } from 'react';

export default function SetupPage() {
    const [status, setStatus] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSeed = async () => {
        setIsLoading(true);
        setStatus('Generando datos...');

        try {
            const response = await fetch('/api/seed-data', {
                method: 'POST',
            });

            const data = await response.json();

            if (response.ok) {
                setStatus(`✅ ${data.message}`);
            } else {
                setStatus(`❌ Error: ${data.error}`);
            }
        } catch (error: any) {
            setStatus(`❌ Error: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2rem',
            padding: '2rem',
            background: 'var(--color-background)',
            color: 'var(--color-text-primary)',
        }}>
            <h1 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '2rem',
                color: 'var(--color-primary)',
                textShadow: '0 0 20px var(--color-primary-glow)',
            }}>
                Setup Inicial - Supabase
            </h1>

            <button
                onClick={handleSeed}
                disabled={isLoading}
                style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.2rem',
                    padding: '1rem 2rem',
                    background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                    color: 'var(--color-background)',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    opacity: isLoading ? 0.6 : 1,
                }}
            >
                {isLoading ? 'Generando...' : '🚀 Generar 60 días de datos de ejemplo'}
            </button>

            {status && (
                <p style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '1rem',
                    color: status.includes('✅') ? 'var(--color-positive)' : 'var(--color-negative)',
                    textAlign: 'center',
                    maxWidth: '600px',
                }}>
                    {status}
                </p>
            )}

            <div style={{
                marginTop: '2rem',
                padding: '1.5rem',
                background: 'rgba(17, 26, 69, 0.6)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                maxWidth: '600px',
            }}>
                <h3 style={{
                    fontFamily: 'var(--font-display)',
                    marginBottom: '1rem',
                    color: 'var(--color-text-primary)',
                }}>
                    ℹ️ Información
                </h3>
                <ul style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.9rem',
                    lineHeight: '1.8',
                    color: 'var(--color-text-secondary)',
                    paddingLeft: '1.5rem',
                }}>
                    <li>Genera usuario demo (demo@demo.com / demo123)</li>
                    <li>Crea 12 actividades (+5 positivas / +7 negativas)</li>
                    <li>Genera 60 días de registros históricos</li>
                    <li>Patrones realistas: productivo en semana, relax en fin de semana</li>
                    <li>Perfecto para ver gráficos y estadísticas</li>
                </ul>
            </div>

            <a
                href="/login"
                style={{
                    marginTop: '1rem',
                    fontFamily: 'var(--font-display)',
                    color: 'var(--color-primary)',
                    textDecoration: 'none',
                }}
            >
                → Ir a Login
            </a>
        </div>
    );
}
