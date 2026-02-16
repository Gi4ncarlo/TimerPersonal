import { Action } from '@/core/types';
import { getActionEmoji } from '@/core/config/actionEmojis';
import Twemoji from './Twemoji';
import './ActionItem.css';

interface ActionItemProps {
    action: Action;
    progress?: string;
    onAdd?: () => void;
    showAddButton?: boolean;
}

export default function ActionItem({
    action,
    progress = '[0/1]',
    onAdd,
    showAddButton = true
}: ActionItemProps) {
    const isPositive = action.type === 'positive';
    const emoji = getActionEmoji(action.name, action.type as 'positive' | 'negative');

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
        e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
    };

    return (
        <div
            className={`action-item ${isPositive ? 'positive' : 'negative'}`}
            onMouseMove={handleMouseMove}
        >
            <div className="action-info">
                <Twemoji emoji={emoji} className="action-emoji" />
                <span className="action-name">{action.name}</span>
                <span className="action-progress">{progress}</span>
            </div>
            {showAddButton && (
                <button className="action-add-btn" onClick={onAdd}>
                    +
                </button>
            )}
        </div>
    );
}
