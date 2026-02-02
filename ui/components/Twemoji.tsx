'use client';

import React, { useEffect, useRef } from 'react';
// @ts-ignore
import twemoji from 'twemoji';
import './Twemoji.css';

interface TwemojiProps {
    emoji: string;
    className?: string;
}

export default function Twemoji({ emoji, className = '' }: TwemojiProps) {
    const spanRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (spanRef.current) {
            twemoji.parse(spanRef.current, {
                folder: 'svg',
                ext: '.svg'
            });
        }
    }, [emoji]);

    return (
        <span ref={spanRef} className={`twemoji-wrapper ${className}`}>
            {emoji}
        </span>
    );
}
