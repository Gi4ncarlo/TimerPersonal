'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SupabaseDataStore } from '@/data/supabaseData';
import './login.css';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const user = await SupabaseDataStore.login(username, password);

            if (user) {
                router.push('/dashboard');
            } else {
                setError('Usuario o contraseña incorrectos');
            }
        } catch (err) {
            setError('Error al iniciar sesión');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-card">
                    <img src="/logo.png" alt="Senda de Logros Logo" className="login-logo" />
                    <h1 className="login-title">Senda de Logros</h1>
                    <p className="login-subtitle">Forja tu destino, paso a paso</p>

                    <form onSubmit={handleLogin} className="login-form">
                        <div className="form-group">
                            <label htmlFor="username">Usuario</label>
                            <input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Ingresa tu usuario"
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">Contraseña</label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Ingresa tu contraseña"
                                required
                                disabled={isLoading}
                            />
                        </div>

                        {error && <p className="error-message">{error}</p>}

                        <button type="submit" className="login-button" disabled={isLoading}>
                            {isLoading ? 'Iniciando...' : 'Iniciar Sesión'}
                        </button>
                    </form>

                    <div className="login-hint">
                        <p className="hint-title">Usuario de prueba:</p>
                        <p className="hint-text">• Usuario: <strong>demo</strong> / Contraseña: <strong>demo123</strong></p>
                        <p className="hint-note">Los datos ahora se guardan permanentemente en Supabase 🎉</p>
                        <p className="hint-text" style={{ marginTop: '1rem' }}>
                            ¿No tienes cuenta? <Link href="/register"><strong>Regístrate aquí</strong></Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
