import './StaticTimeDisplay.css';

interface StaticTimeDisplayProps {
    totalMinutes: number;
    label?: string;
}

export default function StaticTimeDisplay({ totalMinutes, label }: StaticTimeDisplayProps) {
    const isPositive = totalMinutes >= 0;
    const absMinutes = Math.abs(totalMinutes);
    const hours = Math.floor(absMinutes / 60);
    const minutes = absMinutes % 60;

    const formatNumber = (num: number) => num.toString().padStart(2, '0');

    return (
        <div className="static-time-container">
            {label && <p className="static-time-label">{label}</p>}
            <div className="static-time-display">
                <span className="time-digit">{formatNumber(hours)}</span>
                <span className="time-separator">:</span>
                <span className="time-digit">{formatNumber(minutes)}</span>
            </div>
            <p className="time-suffix">{isPositive ? 'horas disponibles' : 'horas en deuda'}</p>
        </div>
    );
}
