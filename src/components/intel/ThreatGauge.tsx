
import React from 'react';

interface ThreatGaugeProps {
    value: number; // 0-100
    label: string;
    subLabel?: string;
}

const ThreatGauge: React.FC<ThreatGaugeProps> = ({ value, label, subLabel }) => {
    const radius = 40;
    const halfCircumference = Math.PI * radius;
    const strokeDashoffset = halfCircumference - (value / 100) * halfCircumference;

    const getColor = (v: number) => {
        if (v > 80) return '#ef4444'; // Red
        if (v > 50) return '#f97316'; // Orange
        if (v > 25) return '#eab308'; // Yellow
        return '#3b82f6'; // Blue
    };

    const color = getColor(value);

    return (
        <div className="flex flex-col items-center justify-center p-2 bg-gray-900/40 border border-gray-800 rounded-lg">
            <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1">{label}</div>

            <div className="relative w-32 h-20 flex items-center justify-center overflow-hidden">
                <svg className="w-24 h-24 transform -rotate-180" viewBox="0 0 100 100">
                    {/* Background Arc */}
                    <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="none"
                        stroke="#1f2937"
                        strokeWidth="8"
                        strokeDasharray={halfCircumference}
                        className="opacity-50"
                    />
                    {/* Progress Arc */}
                    <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="none"
                        stroke={color}
                        strokeWidth="8"
                        strokeDasharray={halfCircumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                    />
                </svg>

                <div className="absolute top-10 flex flex-col items-center">
                    <span className="text-xl font-black font-mono leading-none" style={{ color }}>{value}%</span>
                    {subLabel && <span className="text-[8px] font-mono text-gray-500 uppercase mt-1">{subLabel}</span>}
                </div>
            </div>
        </div>
    );
};

export default ThreatGauge;
