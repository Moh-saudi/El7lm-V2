
import React from 'react';

interface FootballPitchProps {
    primaryPosition?: string;
    secondaryPosition?: string;
    jerseyNumber?: string;
    className?: string;
}

const POS_COORDS: Record<string, { x: number; y: number }> = {
    GK: { x: 50, y: 88 },
    CB: { x: 50, y: 75 },
    LB: { x: 10, y: 60 }, // Shifted a bit for visual clarity
    RB: { x: 90, y: 60 },
    LWB: { x: 10, y: 55 },
    RWB: { x: 90, y: 55 },
    CDM: { x: 50, y: 65 },
    CM: { x: 50, y: 50 },
    CAM: { x: 50, y: 35 },
    LW: { x: 15, y: 25 },
    RW: { x: 85, y: 25 },
    SS: { x: 50, y: 25 },
    ST: { x: 50, y: 12 },
    CF: { x: 50, y: 15 },
};

const ARABIC_TO_ENGLISH: Record<string, string> = {
    "حارس مرمى": "GK",
    "قلب دفاع": "CB",
    "ظهير أيسر": "LB",
    "ظهير أيمن": "RB",
    "وسط دفاعي": "CDM",
    "وسط مركزي": "CM",
    "وسط هجومي": "CAM",
    "جناح أيسر": "LW",
    "جناح أيمن": "RW",
    "مهاجم ثاني": "SS",
    "مهاجم صريح": "ST"
};

export const FootballPitch = ({ primaryPosition, secondaryPosition, jerseyNumber, className }: FootballPitchProps) => {
    // Helper to resolve coordinates
    const getCoords = (pos?: string) => {
        if (!pos) return null;
        const normalized = pos.trim();
        // 1. Try Map (Arabic -> English Code) or keep as is
        let code = ARABIC_TO_ENGLISH[normalized] || normalized;

        // 2. Try Exact Match
        if (POS_COORDS[code]) return POS_COORDS[code];

        // 3. Try Case-Insensitive Match
        const upper = code.toUpperCase();
        if (POS_COORDS[upper]) return POS_COORDS[upper];

        // 4. Fallback to Center (50, 50) so it's visible
        // console.warn(`Unknown position code: ${pos}`);
        return { x: 50, y: 50 };
    };

    const primaryCoords = getCoords(primaryPosition);
    const secondaryCoords = getCoords(secondaryPosition);

    return (
        <div className={`relative w-full aspect-[2/3] bg-emerald-600 rounded-xl border-4 border-emerald-800 shadow-inner overflow-hidden select-none ${className}`}>
            {/* Grass Pattern */}
            <div className="absolute inset-0 opacity-20 bg-[linear-gradient(0deg,transparent_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_10%]" />

            {/* Lines */}
            <div className="absolute inset-4 border-2 border-white/60 rounded-sm" />

            {/* Center Circle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-white/60 rounded-full flex items-center justify-center">
                <div className="w-1 h-1 bg-white/60 rounded-full" />
            </div>
            <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-white/60" />

            {/* Penalty Areas */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-3/5 h-1/6 border-2 border-t-0 border-white/60 bg-white/5" />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3/5 h-1/6 border-2 border-b-0 border-white/60 bg-white/5" />

            {/* Goals */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-4 border-x-2 border-b-2 border-white/60 bg-white/10" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/3 h-4 border-x-2 border-t-2 border-white/60 bg-white/10" />

            {/* Players */}
            {secondaryCoords && (
                <div
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10 opacity-60 grayscale scale-75"
                    style={{ top: `${secondaryCoords.y}%`, left: `${secondaryCoords.x}%` }}
                >
                    <div className="w-10 h-10 bg-yellow-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-yellow-900 font-bold text-xs">
                        2
                    </div>
                </div>
            )}

            {primaryCoords && (
                <div
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-700 ease-out z-20"
                    style={{ top: `${primaryCoords.y}%`, left: `${primaryCoords.x}%` }}
                >
                    <div className="relative group">
                        {/* Pulse Effect */}
                        <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75" />
                        {/* Dot/Shirt */}
                        <div className="relative w-12 h-12 bg-red-600 rounded-full border-2 border-white shadow-xl flex items-center justify-center text-white font-black text-lg">
                            {jerseyNumber || '#'}
                        </div>
                    </div>
                    <div className="mt-1 px-2 py-0.5 bg-black/60 text-white text-[10px] font-bold rounded-full backdrop-blur-md shadow-sm border border-white/10 cursor-default">
                        {primaryPosition}
                    </div>
                </div>
            )}

            {/* Legend (if needed) */}
            {/* <div className="absolute bottom-2 left-2 text-[10px] text-white/80">
                Red: Primary ({primaryPosition})
            </div> */}
        </div>
    );
};
