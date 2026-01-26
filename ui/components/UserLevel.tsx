import './UserLevel.css';

interface UserLevelProps {
    level: number;
    xp: number;
}

export default function UserLevel({ level, xp }: UserLevelProps) {
    // Logic: Level N needs 1000 XP
    const xpForNextLevel = 1000;
    const currentLevelXp = xp % 1000;
    const progress = (currentLevelXp / xpForNextLevel) * 100;

    return (
        <div className="user-level-card">
            <div className="level-info">
                <div className="level-badge">
                    <span className="level-label">LVL</span>
                    <span className="level-number">{level}</span>
                </div>
                <div className="xp-info">
                    <span className="xp-text">{currentLevelXp} / {xpForNextLevel} XP</span>
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
