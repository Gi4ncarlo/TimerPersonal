'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import LogoLoader from '@/ui/components/LogoLoader';
import { Session } from '@supabase/supabase-js';

type AuthContextType = {
    session: Session | null;
    isLoading: boolean;
};

const AuthContext = createContext<AuthContextType>({
    session: null,
    isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

const PUBLIC_ROUTES = ['/login', '/register'];

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        // 1. Restore session from localStorage (instant, survives tab close)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!mounted) return;
            setSession(session);
            setIsLoading(false);
        });

        // 2. Listen for auth changes (login, logout, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                if (!mounted) return;
                setSession(session);
                setIsLoading(false);
            }
        );

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    // ── Redirect Logic ──
    useEffect(() => {
        if (isLoading) return; // Wait until session is resolved

        const isPublic = PUBLIC_ROUTES.includes(pathname || '');
        const isRoot = pathname === '/';

        if (session) {
            // Authenticated user on login/register/root → send to dashboard
            if (isPublic || isRoot) {
                router.replace('/dashboard');
            }
        } else {
            // Unauthenticated user on protected route → send to login
            if (!isPublic && !isRoot) {
                router.replace('/login');
            }
        }
    }, [session, isLoading, pathname, router]);

    // ── Render Logic ──

    // Show spinner while checking auth on protected routes
    const isPublicRoute = PUBLIC_ROUTES.includes(pathname || '') || pathname === '/';

    if (isLoading && !isPublicRoute) {
        return <LogoLoader />;
    }

    return (
        <AuthContext.Provider value={{ session, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}
