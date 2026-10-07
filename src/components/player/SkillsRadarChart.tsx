'use client';

import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

export interface PlayerStatsPayload {
  pace?: number;
  shooting?: number;
  passing?: number;
  dribbling?: number;
  defending?: number;
  physical?: number;
}

export interface SkillsRadarChartProps {
  stats?: PlayerStatsPayload;
  technicalSkills?: Record<string, number>;
  physicalSkills?: Record<string, number>;
  socialSkills?: Record<string, number>;
  labels?: {
    pace?: string;
    shooting?: string;
    passing?: string;
    dribbling?: string;
    defending?: string;
    physical?: string;
  };
  title?: string;
  className?: string;
  compact?: boolean;
}

export const SkillsRadarChart: React.FC<SkillsRadarChartProps> = ({
  stats,
  technicalSkills,
  physicalSkills,
  socialSkills,
  labels,
  title,
  className = '',
  compact = false,
}) => {
  const hasCoreStats = stats !== undefined && Object.values(stats).some((v) => v !== undefined && v !== null);

  if (hasCoreStats) {
    const pace = Number(stats?.pace ?? 50);
    const shooting = Number(stats?.shooting ?? 50);
    const passing = Number(stats?.passing ?? 50);
    const dribbling = Number(stats?.dribbling ?? 50);
    const defending = Number(stats?.defending ?? 50);
    const physical = Number(stats?.physical ?? 50);

    const ovr = Math.round((pace + shooting + passing + dribbling + defending + physical) / 6);

    const data = [
      { subject: labels?.pace || 'السرعة (PAC)', value: pace, fullMark: 100 },
      { subject: labels?.shooting || 'التسديد (SHO)', value: shooting, fullMark: 100 },
      { subject: labels?.passing || 'التمرير (PAS)', value: passing, fullMark: 100 },
      { subject: labels?.dribbling || 'المراوغة (DRI)', value: dribbling, fullMark: 100 },
      { subject: labels?.defending || 'الدفاع (DEF)', value: defending, fullMark: 100 },
      { subject: labels?.physical || 'اللياقة (PHY)', value: physical, fullMark: 100 },
    ];

    return (
      <div className={`bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm transition-all hover:shadow-md ${className}`}>
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              {title || 'رادار القدرات الفنية والتكتيكية'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">تقييم الأداء الميداني وفق معايير نسر AI</p>
          </div>
          <div className="flex flex-col items-center bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 px-3 py-1 rounded-xl shadow-sm font-black leading-tight border border-amber-300">
            <span className="text-lg">{ovr}</span>
            <span className="text-[9px] font-extrabold tracking-wider uppercase">OVR</span>
          </div>
        </div>

        <div className={compact ? 'h-[260px]' : 'h-[320px]'}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius={compact ? '68%' : '75%'} data={data}>
              <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: '#334155', fontSize: compact ? 10 : 11, fontWeight: 700 }}
              />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar
                name="التقييم"
                dataKey="value"
                stroke="#059669"
                strokeWidth={2.5}
                fill="#10b981"
                fillOpacity={0.35}
                isAnimationActive={true}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs shadow-lg font-bold border border-slate-800">
                        <span>{item.subject}: </span>
                        <span className="text-emerald-400">{item.value} / 100</span>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  // Fallback to legacy categories if provided
  const tech = technicalSkills || {};
  const phys = physicalSkills || {};
  const soc = socialSkills || {};

  const keys = Array.from(new Set([...Object.keys(tech), ...Object.keys(phys), ...Object.keys(soc)]));
  if (keys.length === 0) {
    return null;
  }

  const legacyData = keys.map((skill) => ({
    skill:
      skill === 'ball_control'
        ? 'التحكم بالكرة'
        : skill === 'passing'
        ? 'التمرير'
        : skill === 'shooting'
        ? 'التسديد'
        : skill === 'dribbling'
        ? 'المراوغة'
        : skill,
    technical: tech[skill] || 0,
    physical: phys[skill] || 0,
    social: soc[skill] || 0,
  }));

  return (
    <div className={`bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm ${className}`}>
      <h3 className="text-base font-bold text-slate-900 mb-4 text-center">{title || 'تحليل المهارات'}</h3>
      <div className={compact ? 'h-[260px]' : 'h-[320px]'}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={legacyData}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11, fill: '#374151', fontWeight: 600 }} />
            <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fontSize: 9, fill: '#6b7280' }} />
            <Radar name="المهارات الفنية" dataKey="technical" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} />
            <Radar name="المهارات البدنية" dataKey="physical" stroke="#10b981" fill="#10b981" fillOpacity={0.25} />
            <Radar name="المهارات الاجتماعية" dataKey="social" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.25} />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SkillsRadarChart;
