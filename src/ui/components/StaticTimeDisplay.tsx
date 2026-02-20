import './StaticTimeDisplay.css';

interface StaticTimeDisplayProps {
    totalPoints: number; // Changed from totalMinutes to totalPoints
    label?: string;
}

export default function StaticTimeDisplay({ totalPoints, label }: StaticTimeDisplayProps) {
    const isPositive = totalPoints >= 0;
    const absPoints = Math.abs(totalPoints);

    // Format points with thousands separator for better readability
    const formatPoints = (points: number) => {
        return points.toLocaleString('es-ES');
    };

    return (
        <div className={`static-time-container ${isPositive ? 'points-positive' : 'points-negative'} accumulated-value`}>
            {label && <p className="static-time-label">{label}</p>}
            <div className="static-points-display">
                <img src="/images/senda-coin-large-sinbg.png" alt="Sendas" className="senda-floating-icon senda-floating-icon--lg static-senda-icon" />
                <span className="points-value">{formatPoints(absPoints)}</span>
            </div>
            <p className="points-suffix">
                {isPositive ? 'sendas obtenidas' : 'sendas en deuda'}
            </p>
        </div>
    );
}
