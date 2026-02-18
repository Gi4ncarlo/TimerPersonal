'use client';

import './LogoLoader.css';

/**
 * Premium full-screen loading component with animated logo.
 * Replaces all "Cargando..." text loaders across the app.
 * 
 * Features:
 * - Floating logo with soft bounce
 * - 3 concentric orbiting rings
 * - 4 particle dots in elliptical orbits
 * - Pulsing glow behind logo
 * - Sliding progress bar
 */
export default function LogoLoader() {
    return (
        <div className="logo-loader">
            <div className="logo-loader__icon-wrapper">
                {/* Glow pulse behind logo */}
                <div className="logo-loader__glow" />

                {/* Logo image */}
                <img
                    src="/logo.png"
                    alt="Senda de Logros"
                    className="logo-loader__image"
                />

                {/* Orbiting rings */}
                <div className="logo-loader__ring logo-loader__ring--1" />
                <div className="logo-loader__ring logo-loader__ring--2" />
                <div className="logo-loader__ring logo-loader__ring--3" />

                {/* Floating particles */}
                <div className="logo-loader__particles">
                    <div className="logo-loader__particle" />
                    <div className="logo-loader__particle" />
                    <div className="logo-loader__particle" />
                    <div className="logo-loader__particle" />
                </div>
            </div>

            {/* Subtle progress bar */}
            <div className="logo-loader__progress">
                <div className="logo-loader__progress-bar" />
            </div>
        </div>
    );
}
