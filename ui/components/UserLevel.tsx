import './UserLevel.css';
import { getLevelTitle } from '@/core/config/levelRewards';

interface UserLevelProps {
    level: number;
    xp: number;
    avatarUrl?: string;
    onClick?: () => void;
}

export default function UserLevel({ level, xp, avatarUrl, onClick }: UserLevelProps) {
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
                <div className="level-badge">
                    <span className="level-label">LVL</span>
                    <span className="level-number">{level}</span>
                </div>
                <span className="level-title">{levelTitle}</span>
                <div className="xp-info">
                    <div className="xp-header">
                        <span className="xp-label">EXPERIENCIA</span>
                        <span className="xp-text">{currentLevelXp} / {xpForNextLevel} XP</span>
                    </div>
                    <div className="xp-bar-container">
                        <div
                            className="xp-bar-fill"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
