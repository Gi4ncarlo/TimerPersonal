import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { SupabaseDataStore } from '@/data/supabaseData';
import UserLevel from './UserLevel';
import './Navbar.css';

interface NavbarProps {
    currentUser: any;
    userLevel?: { level: number; xp: number };
    isOnVacation?: boolean;
    onProfileClick?: () => void;
    showArmoryToggle?: boolean;
    isArmoryOpen?: boolean;
    onArmoryToggle?: (open: boolean) => void;
}

export default function Navbar({
    currentUser,
    userLevel,
    isOnVacation = false,
    onProfileClick,
    showArmoryToggle = false,
    isArmoryOpen = false,
    onArmoryToggle
}: NavbarProps) {
    const router = useRouter();
    const pathname = usePathname();

    const handleLogout = async () => {
        await SupabaseDataStore.logout();
        router.push('/login');
    };

    const isActive = (path: string) => pathname === path ? 'active' : '';

    return (
        <header className="navbar">
            <div className="navbar-container">
                <div className="navbar-brand">
                    <Link href="/dashboard" className="brand-link">
                        <h1 className="brand-title">Senda de Logros</h1>
                    </Link>
                    {userLevel && currentUser && (
                        <UserLevel
                            level={userLevel.level}
                            xp={userLevel.xp}
                            avatarUrl={currentUser.avatarUrl}
                            isOnVacation={isOnVacation}
                            onClick={onProfileClick}
                        />
                    )}
                </div>

                <nav className="navbar-links">
                    <Link href="/vacaciones" className={`nav-item ${isActive('/vacaciones')}`}>🏖 Bitácora</Link>
                    <Link href="/leaderboard" className={`nav-item ${isActive('/leaderboard')}`}>🏆 Leaderboard</Link>
                    <Link href="/estadisticas" className={`nav-item ${isActive('/estadisticas')}`}>📊 Stats</Link>
                    <Link href="/strikes" className={`nav-item strike-link ${isActive('/strikes')}`}>⚠️ Strikes</Link>

                    {currentUser?.role === 'admin' && (
                        <Link href="/dashboard/admin" className={`nav-item admin-link ${isActive('/dashboard/admin')}`}>🛠 Admin</Link>
                    )}

                    {showArmoryToggle && (
                        <button
                            className={`nav-item armory-toggle ${isArmoryOpen ? 'active' : ''}`}
                            onClick={() => onArmoryToggle?.(!isArmoryOpen)}
                            title="Desplegar Arsenal de Acciones"
                        >
                            ⚔️ Arsenal
                        </button>
                    )}

                    <button className="navbar-logout" onClick={handleLogout}>Salir</button>
                </nav>
            </div>
        </header>
    );
}
