import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { SupabaseDataStore } from '@/data/supabaseData';
import UserLevel from './UserLevel';
import Twemoji from './Twemoji';
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
                {/* Left: Brand + Profile Card */}
                <div className="navbar-left-group">
                    <div className="brand-section">
                        <Link href="/dashboard" style={{ textDecoration: 'none' }}>
                            <h1 className="brand-title">Senda de Logros</h1>
                        </Link>
                    </div>

                    {userLevel && currentUser && (
                        <div className="profile-wrapper" onClick={onProfileClick}>
                            <UserLevel
                                level={userLevel.level}
                                xp={userLevel.xp}
                                avatarUrl={currentUser.avatarUrl}
                                isOnVacation={isOnVacation}
                            />
                        </div>
                    )}
                </div>

                {/* Right: Navigation Buttons */}
                <div className="navbar-right-group">
                    <Link href="/leaderboard" className={`nav-item ${isActive('/leaderboard')}`}>
                        <Twemoji emoji="🏆" /> <span>Leaderboard</span>
                    </Link>
                    <Link href="/estadisticas" className={`nav-item ${isActive('/estadisticas')}`}>
                        <Twemoji emoji="📊" /> <span>Estadísticas</span>
                    </Link>
                    <Link href="/strikes" className={`nav-item strike-link ${isActive('/strikes')}`}>
                        <Twemoji emoji="⚠️" /> <span>Strikes</span>
                    </Link>

                    {showArmoryToggle && (
                        <button
                            className={`nav-item armory-toggle ${isArmoryOpen ? 'active' : ''}`}
                            onClick={() => onArmoryToggle?.(!isArmoryOpen)}
                            title="Arsenal"
                        >
                            <Twemoji emoji="⚔️" /> <span>Arsenal</span>
                        </button>
                    )}

                    {currentUser?.role === 'admin' && (
                        <Link href="/dashboard/admin" className={`nav-item admin-link ${isActive('/dashboard/admin')}`}>
                            <Twemoji emoji="🛠" /> <span>Admin</span>
                        </Link>
                    )}

                    <button className="navbar-logout" onClick={handleLogout} title="Salir">
                        <Twemoji emoji="🚪" />
                        <span style={{ marginLeft: 6, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>Salir</span>
                    </button>
                </div>
            </div>
        </header>
    );
}
