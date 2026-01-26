import './Timer.css';

interface TimerProps {
    hours: number;
    minutes: number;
    seconds: number;
    label?: string;
}

export default function Timer({ hours, minutes, seconds, label }: TimerProps) {
    const formatNumber = (num: number) => num.toString().padStart(2, '0');

    return (
        <div className="timer-container">
            {label && <p className="timer-label">{label}</p>}
            <div className="timer-display">
                <span className="timer-digit">{formatNumber(hours)}</span>
                <span className="timer-separator">:</span>
                <span className="timer-digit">{formatNumber(minutes)}</span>
                <span className="timer-separator">:</span>
                <span className="timer-digit">{formatNumber(seconds)}</span>
            </div>
        </div>
    );
}
