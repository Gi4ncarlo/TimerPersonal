import './QuestCard.css';

interface QuestCardProps {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    action?: React.ReactNode;
    className?: string;
}

export default function QuestCard({ title, subtitle, children, action, className = '' }: QuestCardProps) {
    return (
        <div className={`quest-card ${className}`}>
            <div className="quest-header">
                <div className="quest-header-main">
                    <h2 className="quest-title">{title}</h2>
                    {subtitle && <p className="quest-subtitle">{subtitle}</p>}
                </div>
                {action && <div className="quest-header-action">{action}</div>}
            </div>
            <div className="quest-content">
                {children}
            </div>
        </div>
    );
}
