'use client';

import Image from 'next/image';
import { useState } from 'react';
import './Avatar.css';

interface AvatarProps {
    src?: string | null;
    alt: string;
    fallback: string; // Initials or text to show if no image
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    className?: string;
    showBorder?: boolean;
    borderColor?: string;
}

export default function Avatar({
    src,
    alt,
    fallback,
    size = 'md',
    className = '',
    showBorder = true,
}: AvatarProps) {
    const [imgError, setImgError] = useState(false);

    const sizeMap = {
        sm: 64, // doubled for retina
        md: 80,
        lg: 128,
        xl: 256,
        '2xl': 320
    };

    const pixelSize = sizeMap[size];
    const initials = fallback.slice(0, 2).toUpperCase();

    return (
        <div className={`avatar-component avatar-${size} ${className} ${showBorder ? 'avatar-bordered' : ''}`}>
            {src && !imgError ? (
                <Image
                    src={src}
                    alt={alt}
                    width={pixelSize}
                    height={pixelSize}
                    className="avatar-image"
                    onError={() => setImgError(true)}
                    priority={size === 'xl' || size === '2xl'} // Prioritize loading for large profile avatars
                    quality={95}
                />
            ) : (
                <div className="avatar-fallback">
                    {initials}
                </div>
            )}
        </div>
    );
}
