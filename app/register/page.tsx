'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import '../login/login.css';

export default function RegisterPage() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setIsLoading(true);

        try {
            // IMPORTANT: Use the email field directly for auth
            // Login expects ${username}@demo.com format, so we need consistency
            console.log('🔐 Registrando usuario:', { username, email });

            // Register user in Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        username: username, // Store username in metadata
                    }
                }
            });

            console.log('✅ Auth Response:', {
                user: authData.user?.id,
                error: authError?.message,
                session: !!authData.session
            });

            if (authError) throw authError;

            if (!authData.user) {
                throw new Error('No se pudo crear el usuario');
            }

            // Check if email confirmation is required
            if (!authData.session) {
                setError('Por favor, revisa tu email para confirmar tu cuenta antes de iniciar sesión.');
                console.log('⚠️ Email confirmation required');
                setIsLoading(false);
                return;
            }

            // Create user profile
            const { error: profileError } = await supabase
                .from('users')
                .insert({
                    id: authData.user.id,
                    username,
                    preferences: {},
                });

            console.log('👤 Profile created:', { error: profileError?.message });

            if (profileError) throw profileError;

            // Create default actions for new user
            const defaultActions = [
                { name: 'Ver Stream', type: 'negative', points_per_minute: -8, metadata: { inputType: 'hours', unit: 'horas' } },
                { name: 'Jugar videojuegos', type: 'negative', points_per_minute: -7, metadata: { inputType: 'hours', unit: 'horas' } },
                { name: 'Ver Videos YT', type: 'negative', points_per_minute: -6, metadata: { inputType: 'hours', unit: 'horas' } },
                { name: 'Salir a bailar', type: 'negative', points_per_minute: -9, metadata: { inputType: 'hours', unit: 'horas' } },
                { name: 'Redes Sociales', type: 'negative', points_per_minute: -7, metadata: { inputType: 'hours', unit: 'horas' } },
                { name: 'Netflix/Series', type: 'negative', points_per_minute: -6, metadata: { inputType: 'hours', unit: 'horas' } },
                { name: 'Procrastinar', type: 'negative', points_per_minute: -8, metadata: { inputType: 'hours', unit: 'horas' } },
                { name: 'Leer', type: 'positive', points_per_minute: 5, metadata: { inputType: 'pages', unit: 'páginas', estimatedMinutesPerPage: 3 } },
                { name: 'Correr', type: 'positive', points_per_minute: 12, metadata: { inputType: 'distance-time', unit: 'km' } },
                { name: 'Actividad Física general', type: 'positive', points_per_minute: 10, metadata: { inputType: 'time', unit: 'minutos' } },
                { name: 'Trabajar activamente', type: 'positive', points_per_minute: 8, metadata: { inputType: 'time-note', unit: 'minutos' } },
                { name: 'Estudiar', type: 'positive', points_per_minute: 10, metadata: { inputType: 'time-subject', unit: 'minutos' } },
            ];

            const { error: actionsError } = await supabase
                .from('actions')
                .insert(defaultActions.map(a => ({ ...a, user_id: authData.user!.id })));

            console.log('🎯 Actions created:', { error: actionsError?.message });

            if (actionsError) throw actionsError;

            console.log('✨ Registration complete! Redirecting to dashboard...');

            // Redirect to dashboard
            router.push('/dashboard');
        } catch (err: any) {
            console.error('❌ Registration error:', err);
            setError(err.message || 'Error al registrar usuario');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-card">
                    <h1 className="login-title">Quest Tracker</h1>
                    <p className="login-subtitle">Crear Cuenta</p>

                    <form onSubmit={handleRegister} className="login-form">
                        <div className="form-group">
                            <label htmlFor="username">Usuario</label>
                            <input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Elige un nombre de usuario"
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="email">Email</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="tu@email.com"
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
                                placeholder="Mínimo 6 caracteres"
                                required
                                disabled={isLoading}
                                minLength={6}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirmPassword">Confirmar Contraseña</label>
                            <input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Repite tu contraseña"
                                required
                                disabled={isLoading}
                            />
                        </div>

                        {error && <p className="error-message" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{error}</p>}

                        <button type="submit" className="login-button" disabled={isLoading}>
                            {isLoading ? 'Creando cuenta...' : 'Registrarse'}
                        </button>
                    </form>

                    <div className="login-hint">
                        <p className="hint-text">
                            ¿Ya tienes cuenta? <Link href="/login"><strong>Inicia sesión</strong></Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
