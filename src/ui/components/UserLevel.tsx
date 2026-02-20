import './UserLevel.css';
import { getLevelTitle } from '@/core/config/levelRewards';
import Avatar from './Avatar';

interface UserLevelProps {
    level: number;
    xp: number;
    avatarUrl?: string;
    isOnVacation?: boolean;
    onClick?: () => void;
}

export default function UserLevel({ level, xp, avatarUrl, isOnVacation, onClick }: UserLevelProps) {
    const xpForNextLevel = 1000;
    const currentLevelXp = xp % 1000;
    const progress = Math.min(100, (currentLevelXp / xpForNextLevel) * 100);
    const levelTitle = getLevelTitle(level);

    return (
        <div className={`user-level-card ${onClick ? 'clickable' : ''}`} onClick={onClick} title="Ver Perfil">
            <div className="avatar-preview">
                <Avatar
                    src={avatarUrl}
                    alt="User"
                    fallback="ME"
                    size="md"
                    className="preview-img"
                    showBorder={false}
                />
            </div>

            <div className="level-info">
                <div className="level-top-row">
                    <div className="level-badge">
                        <span className="level-label">LVL</span>
                        <span className="level-number">{level}</span>
                    </div>
                    <div className={`status-badge-compact ${isOnVacation ? 'on-vacation' : 'active'}`}>
                        <span className="status-dot"></span>
                        {isOnVacation ? 'VACACIONES' : 'ACTIVO'}
                    </div>
                </div>

                <div className="level-middle-row">
                    <span className="level-title-main">{levelTitle}</span>
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
