'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import LogoLoader from '@/ui/components/LogoLoader';

export default function Home() {
    const router = useRouter();
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                // Use getSession() — reads from localStorage, instant, survives tab close
                const { data: { session } } = await supabase.auth.getSession();

                if (session) {
                    router.replace('/dashboard');
                } else {
                    router.replace('/login');
                }
            } catch {
                router.replace('/login');
            } finally {
                setChecking(false);
            }
        };

        checkAuth();
    }, [router]);

    if (!checking) return null;

    return <LogoLoader />;
}
