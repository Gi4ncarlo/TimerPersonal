import './UserLevel.css';
import { getLevelTitle } from '@/core/config/levelRewards';

interface UserLevelProps {
    level: number;
    xp: number;
    avatarUrl?: string;
    isOnVacation?: boolean;
    onClick?: () => void;
}

export default function UserLevel({ level, xp, avatarUrl, isOnVacation, onClick }: UserLevelProps) {
    // Logic: Level N needs 1000 XP
    const xpForNextLevel = 1000;
    const currentLevelXp = xp % 1000;
    const progress = (currentLevelXp / xpForNextLevel) * 100;
    const levelTitle = getLevelTitle(level);

    return (
        <div className={`user-level-card ${onClick ? 'clickable' : ''}`} onClick={onClick}>
            <div className="avatar-preview">
                {avatarUrl ? (
                    <img src={avatarUrl} alt="User" className="preview-img" />
                ) : (
                    <div className="preview-placeholder">👤</div>
                )}
            </div>
            <div className="level-info">
                <div className="level-top-row">
                    <div className="level-badge">
                        <span className="level-label">LVL</span>
                        <span className="level-number">{level}</span>
                    </div>
                    <div className={`status-badge-compact ${isOnVacation ? 'on-vacation' : 'active'}`}>
                        <span className="status-dot"></span>
                        {isOnVacation ? 'DE VACACIONES' : 'ACTIVO'}
                    </div>
                </div>

                <div className="level-middle-row">
                    <span className="level-title-main">{levelTitle}</span>
                </div>

                <div className="xp-info-row">
                    <div className="xp-label-group">
                        <span className="xp-label-text">EXPERIENCIA</span>
                        <span className="xp-value-text">{currentLevelXp} / {xpForNextLevel} XP</span>
                    </div>
                    <div className="xp-progress-container">
                        <div
                            className="xp-progress-fill"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
