import { useState, useEffect } from 'react';
import './UserLevel.css';
import { getLevelTitle } from '@/core/config/levelRewards';
import { SupabaseDataStore } from '@/data/supabaseData';
import { LEAGUE_THRESHOLDS, League, Strike } from '@/core/types';
import Avatar from './Avatar';
import Twemoji from './Twemoji';

const COSMETIC_AVATAR_MAP: Record<string, string> = {
    crown: '👑', bolt: '⚡', shield_avatar: '🛡️', fire: '🔥', star: '⭐', skull: '💀',
};
const getCosmeticEmoji = (slug: string): string => COSMETIC_AVATAR_MAP[slug] || slug;

interface UserLevelProps {
    userId?: string;
    level: number;
    xp: number;
    avatarUrl?: string;
    isOnVacation?: boolean;
    cosmeticAvatar?: string;
    onClick?: () => void;
}

export default function UserLevel({ userId, level, xp, avatarUrl, isOnVacation, cosmeticAvatar, onClick }: UserLevelProps) {
    const xpForNextLevel = 1000;
    const currentLevelXp = xp % 1000;
    const progress = Math.min(100, (currentLevelXp / xpForNextLevel) * 100);
    const levelTitle = getLevelTitle(level);

    // Liga Premium
    const [league, setLeague] = useState<League>(LEAGUE_THRESHOLDS[0]);
    const [strikes, setStrikes] = useState<Strike[]>([]);

    useEffect(() => {
        if (userId) {
            SupabaseDataStore.getUserBalance(userId).then(pts => {
                const currentLeague = LEAGUE_THRESHOLDS.reduce((prev, curr) => {
                    return pts >= curr.minPoints ? curr : prev;
                });
                setLeague(currentLeague);
            });
            SupabaseDataStore.getStrikes().then(s => setStrikes(s));
        }
    }, [userId]);

    return (
        <div className={`user-level-card ${onClick ? 'clickable' : ''}`} onClick={onClick} title="Ver Perfil">
            <div className="avatar-preview" style={{ position: 'relative' }}>
                <Avatar
                    src={avatarUrl}
                    alt="User"
                    fallback="ME"
                    size="md"
                    className="preview-img"
                    showBorder={false}
                />
                {cosmeticAvatar && (
                    <div className="cosmetic-badge cosmetic-badge--sm" style={{ position: 'absolute', top: '-8px', left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
                        <Twemoji emoji={getCosmeticEmoji(cosmeticAvatar)} />
                    </div>
                )}
            </div>

            <div className="level-info">
                <div className="level-top-row">
                    <div className="level-badge">
                        <span className="level-label">LVL</span>
                        <span className="level-number">{level}</span>
                    </div>

                    {strikes.length > 0 && (
                        <div className={`level-strikes-badge level-strikes-badge--${Math.min(strikes.length, 5)}`}>
                            <Twemoji emoji="🔥" />
                            <span>{strikes.length}</span>
                        </div>
                    )}

                    <div className={`status-badge-compact ${isOnVacation ? 'on-vacation' : 'active'}`}>
                        <span className="status-dot"></span>
                        {isOnVacation ? 'VACACIONES' : 'ACTIVO'}
                    </div>
                </div>

                <div className="level-middle-row" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <img src={league.imgUrl} alt={league.tier} style={{ width: '18px', height: '18px', objectFit: 'contain' }} className="badge-premium" />
                    <span className="level-title-main" style={{ color: league.color }}>{league.tier}</span>
                    <span className="level-title-main" style={{ opacity: 0.6, fontSize: '0.85em' }}>• {levelTitle}</span>
                </div>

                <div className="xp-info-row">
                    <div className="xp-progress-container">
                        <div
                            className="xp-progress-fill"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <div className="xp-details">
                        <span>EXPERIENCIA</span>
                        <span className="xp-val">{currentLevelXp} / {xpForNextLevel} XP</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
