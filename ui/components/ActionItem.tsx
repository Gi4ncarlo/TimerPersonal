import { Action } from '@/core/types';
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

    return (
        <div className={`action-item ${isPositive ? 'positive' : 'negative'}`}>
            <div className="action-info">
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
