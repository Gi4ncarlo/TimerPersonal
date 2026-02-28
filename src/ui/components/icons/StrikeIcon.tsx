import React, { CSSProperties } from 'react';

interface StrikeIconProps {
    className?: string;
    style?: CSSProperties;
    width?: number | string;
    height?: number | string;
    colors?: {
        main?: string;
        glow?: string;
    }
}

export default function StrikeIcon({ className = '', style, width = 16, height = 16, colors }: StrikeIconProps) {
    const mainColor = colors?.main || '#f43f5e';
    const glowColor = colors?.glow || '#ff8a65';

    return (
        <svg
            className={`strike-icon ${className}`}
            style={style}
            width={width}
            height={height}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <linearGradient id="strikeGrad" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor={glowColor} />
                    <stop offset="50%" stopColor={mainColor} />
                    <stop offset="100%" stopColor="#9f1239" />
                </linearGradient>
                <filter id="strikeGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
            </defs>
            <path
                d="M10.8656 2.50373C11.3323 1.90796 12.2731 2.00542 12.5919 2.68266C13.9272 5.51677 15.7981 8.36838 17.8099 10.7025C19.1039 12.2031 20.9806 14.4705 21.6038 16.5098C22.2125 18.4912 21.7103 20.9994 20.0583 22.7303C17.9734 24.9082 14.6479 25.6766 11.6938 25.6766C8.73977 25.6766 5.41434 24.9082 3.32943 22.7303C1.67735 20.9994 1.17518 18.4912 1.78386 16.5098C2.40707 14.4705 4.28384 12.2031 5.57782 10.7025C7.26259 8.74852 8.79973 6.38541 9.97491 4.07722C10.247 3.53974 10.544 3.00445 10.8656 2.50373Z"
                fill="url(#strikeGrad)"
                filter="url(#strikeGlow)"
            />
            <path
                d="M11.6938 9.01452C11.6938 9.01452 9.47228 12.346 9.47228 15.6775C9.47228 17.9008 11.1384 19.0124 11.6938 19.0124C12.2492 19.0124 13.9153 17.9008 13.9153 15.6775C13.9153 12.8996 11.6938 9.01452 11.6938 9.01452Z"
                fill="#FFD700"
                opacity="0.8"
            />
        </svg>
    );
}
