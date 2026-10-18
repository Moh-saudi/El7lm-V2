'use client';

import React, { useMemo } from 'react';
import { FootballSkills } from '../types';
import { getSkillDefinitions } from './studio-utils';

interface Props {
    skills: FootballSkills;
    isGK: boolean;
    size?: number;
    /** Optional baseline to compare against (e.g., average for position) */
    baseline?: FootballSkills;
}

/**
 * Radar Chart سداسي بصري مستوحى من معايير الكشافة الدولية (Wyscout)
 * بنسخة نهارية واضحة وعالية التباين (Daylight Luxury Hexagon)
 */
export function RadarChart({ skills, isGK, size = 200, baseline }: Props) {
    const defs = useMemo(() => getSkillDefinitions(isGK), [isGK]);
    const cx = size / 2;
    const cy = size / 2;
    const maxR = size * 0.38; // 38% of size for outer ring
    const levels = 4; // 4 concentric rings

    // Convert skill value (30-99) to radius (0-maxR)
    const valueToRadius = (val: number) => ((val - 30) / 69) * maxR;

    // Get polygon points for a set of skills
    const getPoints = (sk: FootballSkills): string => {
        return defs.map((d, i) => {
            const angle = (Math.PI * 2 * i) / defs.length - Math.PI / 2;
            const r = valueToRadius(sk[d.key]);
            const x = cx + r * Math.cos(angle);
            const y = cy + r * Math.sin(angle);
            return `${x},${y}`;
        }).join(' ');
    };

    // Get axis endpoint
    const getAxisPoint = (index: number, radius: number) => {
        const angle = (Math.PI * 2 * index) / defs.length - Math.PI / 2;
        return {
            x: cx + radius * Math.cos(angle),
            y: cy + radius * Math.sin(angle),
        };
    };

    // Concentric level polygons (background grid)
    const levelPolygons = Array.from({ length: levels }, (_, levelIdx) => {
        const r = maxR * ((levelIdx + 1) / levels);
        const pts = defs.map((_, i) => {
            const angle = (Math.PI * 2 * i) / defs.length - Math.PI / 2;
            return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
        }).join(' ');
        return pts;
    });

    const playerPoints = getPoints(skills);
    const baselinePoints = baseline ? getPoints(baseline) : null;

    // Color based on average skill
    const avgSkill = useMemo(() => {
        const vals = defs.map(d => skills[d.key]);
        return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    }, [skills, defs]);

    const mainColor = avgSkill >= 80 ? '#059669' : avgSkill >= 70 ? '#0d9488' : avgSkill >= 60 ? '#d97706' : '#e11d48';

    return (
        <div className="relative flex items-center justify-center select-none">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-xs">
                <defs>
                    <radialGradient id="radarDaylightBg" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#ffffff" />
                        <stop offset="100%" stopColor="#f1f5f9" />
                    </radialGradient>
                    <linearGradient id="radarDaylightFill" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={mainColor} stopOpacity="0.30" />
                        <stop offset="100%" stopColor={mainColor} stopOpacity="0.08" />
                    </linearGradient>
                </defs>

                {/* Background circle */}
                <circle cx={cx} cy={cy} r={maxR + 4} fill="url(#radarDaylightBg)" stroke="#e2e8f0" strokeWidth="1" />

                {/* Concentric level rings */}
                {levelPolygons.map((pts, i) => (
                    <polygon
                        key={i}
                        points={pts}
                        fill="none"
                        stroke="#cbd5e1"
                        strokeWidth={i === levels - 1 ? "1.2" : "0.7"}
                        strokeDasharray={i === levels - 1 ? "none" : "3,3"}
                        opacity="0.9"
                    />
                ))}

                {/* Axis lines */}
                {defs.map((_, i) => {
                    const p = getAxisPoint(i, maxR);
                    return (
                        <line
                            key={i}
                            x1={cx} y1={cy}
                            x2={p.x} y2={p.y}
                            stroke="#cbd5e1"
                            strokeWidth="0.8"
                        />
                    );
                })}

                {/* Baseline polygon (position average) */}
                {baselinePoints && (
                    <polygon
                        points={baselinePoints}
                        fill="rgba(148,163,184,0.10)"
                        stroke="#94a3b8"
                        strokeWidth="1"
                        strokeDasharray="4,3"
                    />
                )}

                {/* Player skill polygon */}
                <polygon
                    points={playerPoints}
                    fill="url(#radarDaylightFill)"
                    stroke={mainColor}
                    strokeWidth="2.4"
                    strokeLinejoin="round"
                    className="transition-all duration-500 ease-out"
                />

                {/* Skill value dots */}
                {defs.map((d, i) => {
                    const angle = (Math.PI * 2 * i) / defs.length - Math.PI / 2;
                    const r = valueToRadius(skills[d.key]);
                    const x = cx + r * Math.cos(angle);
                    const y = cy + r * Math.sin(angle);
                    return (
                        <g key={d.key}>
                            <circle
                                cx={x} cy={y} r="3.5"
                                fill="#ffffff"
                                stroke={mainColor}
                                strokeWidth="2"
                                className="transition-all duration-500 ease-out"
                            />
                        </g>
                    );
                })}

                {/* Axis labels */}
                {defs.map((d, i) => {
                    const p = getAxisPoint(i, maxR + 15);
                    return (
                        <text
                            key={d.key}
                            x={p.x}
                            y={p.y}
                            textAnchor="middle"
                            dominantBaseline="central"
                            className="fill-slate-700 text-[9px] font-bold"
                        >
                            {d.short}
                        </text>
                    );
                })}

                {/* Skill values near the dots */}
                {defs.map((d, i) => {
                    const angle = (Math.PI * 2 * i) / defs.length - Math.PI / 2;
                    const r = valueToRadius(skills[d.key]) + 11;
                    const x = cx + r * Math.cos(angle);
                    const y = cy + r * Math.sin(angle);
                    return (
                        <text
                            key={`val-${d.key}`}
                            x={x}
                            y={y}
                            textAnchor="middle"
                            dominantBaseline="central"
                            className="fill-slate-900 text-[8px] font-mono font-black"
                        >
                            {skills[d.key]}
                        </text>
                    );
                })}
            </svg>
        </div>
    );
}
