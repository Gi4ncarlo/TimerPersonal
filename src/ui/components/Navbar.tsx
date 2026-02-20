import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SmartNotification } from '@/core/types';
import UserLevel from './UserLevel';
import NotificationCenter from './NotificationCenter';
import './Navbar.css';

interface NavbarProps {
    currentUser: any;
    userLevel?: { level: number; xp: number };
    isOnVacation?: boolean;
    onProfileClick?: () => void;
    showArmoryToggle?: boolean;
    isArmoryOpen?: boolean;
    onArmoryToggle?: (open: boolean) => void;
    notifications?: SmartNotification[];
    onNotifRefresh?: () => void;
}

const NAV_LINKS: { href: string; label: string; icon: string; variant?: string }[] = [
    { href: '/dashboard', label: 'Inicio', icon: '🏠' },
    { href: '/leaderboard', label: 'Ranking', icon: '🏆' },
    { href: '/estadisticas', label: 'Stats', icon: '📊' },
    { href: '/tienda', label: 'Tienda', icon: '🏪' },
];

export default function Navbar({
    currentUser,
    userLevel,
    isOnVacation = false,
    onProfileClick,
    showArmoryToggle = false,
    isArmoryOpen = false,
    onArmoryToggle,
    notifications = [],
    onNotifRefresh,
}: NavbarProps) {
    const pathname = usePathname();
    const isActive = (path: string) => pathname === path;

    return (
        <header className="navbar">
            <div className="navbar-inner">
                {/* ── Zone 1: Brand ── */}
                <Link href="/dashboard" className="navbar-brand">
                    <span className="brand-glyph">⚡</span>
                    <div className="brand-text-container">
                        <span className="brand-text-main">SENDA</span>
                        <span className="brand-text-sub">DE LOGROS</span>
                    </div>
                </Link>

                {/* ── Zone 2: Profile Chip ── */}
                {userLevel && currentUser && (
                    <button className="navbar-profile-chip" onClick={onProfileClick} type="button">
                        <UserLevel
                            userId={currentUser.id}
                            level={userLevel.level}
                            xp={userLevel.xp}
                            avatarUrl={currentUser.avatarUrl}
                            isOnVacation={isOnVacation}
                        />
                    </button>
                )}

                {/* ── Zone 3: Navigation ── */}
                <nav className="navbar-nav" role="navigation">
                    {NAV_LINKS.map(link => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={[
                                'nav-pill',
                                isActive(link.href) ? 'is-active' : '',
                                link.variant ? `nav-pill--${link.variant}` : '',
                            ].join(' ')}
                        >
                            <span className="nav-pill__icon">{link.icon}</span>
                            <span className="nav-pill__label">{link.label}</span>
                        </Link>
                    ))}

                    {showArmoryToggle && (
                        <button
                            className={`nav-pill nav-pill--arsenal ${isArmoryOpen ? 'is-active' : ''}`}
                            onClick={() => onArmoryToggle?.(!isArmoryOpen)}
                            type="button"
                        >
                            <span className="nav-pill__icon">⚔️</span>
                            <span className="nav-pill__label">Arsenal</span>
                            {!isArmoryOpen && <span className="nav-pill__dot" />}
                        </button>
                    )}

                    {currentUser?.role === 'admin' && (
                        <Link
                            href="/dashboard/admin"
                            className={`nav-pill nav-pill--admin ${isActive('/dashboard/admin') ? 'is-active' : ''}`}
                        >
                            <span className="nav-pill__icon">🛠</span>
                            <span className="nav-pill__label">Admin</span>
                        </Link>
                    )}
                </nav>

                {/* ── Zone 4: Actions ── */}
                <div className="navbar-actions">
                    {onNotifRefresh && (
                        <NotificationCenter
                            notifications={notifications}
                            onRefresh={onNotifRefresh}
                        />
                    )}
                </div>
            </div>
        </header>
    );
}
