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
        <div className={`static-time-container ${isPositive ? 'points-positive' : 'points-negative'}`}>
            {label && <p className="static-time-label">{label}</p>}
            <div className="static-points-display">
                <span className="points-value">{formatPoints(absPoints)}</span>
                <span className="points-unit">pts</span>
            </div>
            <p className="points-suffix">
                {isPositive ? 'puntos ganados' : 'puntos en deuda'}
            </p>
        </div>
    );
}
