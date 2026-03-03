import { useState, useEffect } from 'react';
import './UserLevel.css';
import { getLevelTitle } from '@/core/config/levelRewards';
import { getLevelProgress } from '@/core/utils/levelUtils';
import { SupabaseDataStore } from '@/data/supabaseData';
import { LEAGUE_THRESHOLDS, League, Strike } from '@/core/types';
import Avatar from './Avatar';
import Twemoji from './Twemoji';
import StrikeIcon from './icons/StrikeIcon';

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
    const { xpForNextLevel, currentLevelXp, progress } = getLevelProgress(xp);
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
        <div className={`user-level-id-card ${onClick ? 'clickable' : ''}`} onClick={onClick} title="Ver Perfil">
            <div className="id-card-avatar-zone">
                <Avatar
                    src={avatarUrl}
                    alt="User"
                    fallback="ME"
                    size="md"
                    className="id-avatar-img"
                    showBorder={false}
                />
                {cosmeticAvatar && (
                    <div className="id-cosmetic-badge">
                        <Twemoji emoji={getCosmeticEmoji(cosmeticAvatar)} />
                    </div>
                )}
            </div>

            <div className="id-card-data-grid">
                <div className="id-data-top-row">
                    <div className="id-level-block">
                        <span className="id-level-label">LVL</span>
                        <span className="id-level-number">{level}</span>
                    </div>

                    {strikes.length > 0 && (
                        <div className={`id-strikes-pill strikes-severity-${Math.min(strikes.length, 5)}`}>
                            <StrikeIcon width={14} height={14} className="strike-svg" />
                            <span className="strike-count">{strikes.length}</span>
                        </div>
                    )}

                    <div className={`id-status-pill ${isOnVacation ? 'vacation' : 'active'}`}>
                        <div className="status-indicator"></div>
                        <span className="status-text">{isOnVacation ? 'VACACIONES' : 'ACTIVO'}</span>
                    </div>
                </div>

                <div className="id-data-bottom-row">
                    <img src={league.imgUrl} alt={league.tier} className="id-league-icon" />
                    <span className="id-league-tier" style={{ color: league.color }}>{league.tier}</span>
                    <span className="id-league-separator">•</span>
                    <span className="id-level-title">{levelTitle}</span>
                </div>

                <div className="id-xp-details">
                    <span className="xp-label">EXPERIENCIA</span>
                    <span className="xp-value">{currentLevelXp} / {xpForNextLevel} XP</span>
                </div>
            </div>

            <div className="id-card-xp-base">
                <div
                    className="id-xp-neon-line"
                    style={{ width: `${progress}%`, backgroundColor: league.color, boxShadow: `0 0 10px ${league.color}` }}
                />
            </div>
        </div>
    );
}

