'use client';

import React, { useState } from 'react';
import { User } from 'lucide-react';

interface MediaAvatarProps {
    src?: string | null;
    alt?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

export function MediaAvatar({ src, alt, size = 'md', className = '' }: MediaAvatarProps) {
    const [hasError, setHasError] = useState(false);

    // If no valid URL, or error loading, show initial or User icon
    const showImage = Boolean(src && !hasError);
    const initial = (alt || '').trim().charAt(0) || '';

    const sizeClasses = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-11 h-11 text-sm',
        xl: 'w-14 h-14 text-base',
    }[size];

    if (!showImage) {
        return (
            <div className={`rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 shadow-2xs select-none ${sizeClasses} ${className}`}>
                {initial ? <span>{initial}</span> : <User className="w-1/2 h-1/2 text-slate-400" />}
            </div>
        );
    }

    return (
        <img
            src={src!}
            alt={alt || 'صورة المستخدم'}
            className={`rounded-full object-cover bg-slate-100 ${sizeClasses} ${className}`}
            onError={() => setHasError(true)}
            loading="lazy"
        />
    );
}
