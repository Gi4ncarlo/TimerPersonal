import './QuestCard.css';

interface QuestCardProps {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    className?: string;
}

export default function QuestCard({ title, subtitle, children, className = '' }: QuestCardProps) {
    return (
        <div className={`quest-card ${className}`}>
            <div className="quest-header">
                <h2 className="quest-title">{title}</h2>
                {subtitle && <p className="quest-subtitle">{subtitle}</p>}
            </div>
            <div className="quest-content">
                {children}
            </div>
        </div>
    );
}
