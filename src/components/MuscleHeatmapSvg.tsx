'use client';

import type { MuscleRecoveryStatus, MuscleRegionId } from '../hooks/useAnalytics';
import { MUSCLE_STATUS_STYLES } from '../hooks/useAnalytics';

interface RegionData {
    id: MuscleRegionId;
    label: string;
    volume: number;
    score: number;
    intensity: number;
    status: MuscleRecoveryStatus;
    lastHitDays: number | null;
}

interface MuscleHeatmapSvgProps {
    activeSide: 'front' | 'back';
    regionsById: Map<MuscleRegionId, RegionData>;
}

/**
 * SVG body silhouette with per-muscle colour fill driven by recovery status.
 * Extracted from ChartsView so it can be lazy-loaded or rendered standalone.
 */
export default function MuscleHeatmapSvg({ activeSide, regionsById }: MuscleHeatmapSvgProps) {
    const getPaint = (regionId: MuscleRegionId) => {
        const region = regionsById.get(regionId);
        const style = MUSCLE_STATUS_STYLES[region?.status ?? 'undertrained'];
        return {
            fill: style.fill,
            stroke: style.stroke,
            fillOpacity: region ? 0.3 + region.intensity * 0.7 : 0.22,
        };
    };

    return (
        <svg viewBox="0 0 200 360" className="w-full h-auto" role="img" aria-label={`${activeSide} body heatmap`}>
            {/* Skeleton outline */}
            <circle cx="100" cy="34" r="20" fill="#101214" stroke="#2a2a2a" />
            <rect x="86" y="52" width="28" height="18" rx="10" fill="#101214" stroke="#2a2a2a" />
            <path
                d="M72 76 Q100 62 128 76 L122 170 Q120 188 128 232 L136 324 H120 L108 240 H92 L80 324 H64 L72 232 Q80 188 78 170 Z"
                fill="#101214"
                stroke="#2a2a2a"
            />
            <rect x="48" y="86" width="18" height="110" rx="9" fill="#101214" stroke="#2a2a2a" />
            <rect x="134" y="86" width="18" height="110" rx="9" fill="#101214" stroke="#2a2a2a" />
            <rect x="82" y="228" width="18" height="110" rx="9" fill="#101214" stroke="#2a2a2a" />
            <rect x="100" y="228" width="18" height="110" rx="9" fill="#101214" stroke="#2a2a2a" />

            {activeSide === 'front' ? (
                <>
                    <ellipse cx="74" cy="88" rx="18" ry="17" {...getPaint('frontShoulders')} />
                    <ellipse cx="126" cy="88" rx="18" ry="17" {...getPaint('frontShoulders')} />

                    <path d="M78 98 Q90 86 98 98 L98 126 Q86 132 78 120 Z" {...getPaint('chest')} />
                    <path d="M122 98 Q110 86 102 98 L102 126 Q114 132 122 120 Z" {...getPaint('chest')} />

                    <rect x="49" y="92" width="16" height="56" rx="8" {...getPaint('biceps')} />
                    <rect x="135" y="92" width="16" height="56" rx="8" {...getPaint('biceps')} />

                    <rect x="88" y="136" width="24" height="70" rx="12" {...getPaint('abs')} />

                    <rect x="82" y="226" width="17" height="78" rx="8.5" {...getPaint('quads')} />
                    <rect x="101" y="226" width="17" height="78" rx="8.5" {...getPaint('quads')} />

                    <rect x="84" y="304" width="13" height="42" rx="6.5" {...getPaint('calves')} />
                    <rect x="103" y="304" width="13" height="42" rx="6.5" {...getPaint('calves')} />
                </>
            ) : (
                <>
                    <ellipse cx="74" cy="88" rx="18" ry="17" {...getPaint('rearShoulders')} />
                    <ellipse cx="126" cy="88" rx="18" ry="17" {...getPaint('rearShoulders')} />

                    <rect x="49" y="88" width="16" height="54" rx="8" {...getPaint('triceps')} />
                    <rect x="135" y="88" width="16" height="54" rx="8" {...getPaint('triceps')} />

                    <path d="M80 96 Q100 82 120 96 L114 138 Q100 144 86 138 Z" {...getPaint('upperBack')} />
                    <path d="M74 120 Q86 112 88 154 L78 186 Q64 178 66 150 Z" {...getPaint('lats')} />
                    <path d="M126 120 Q114 112 112 154 L122 186 Q136 178 134 150 Z" {...getPaint('lats')} />
                    <rect x="88" y="154" width="24" height="48" rx="12" {...getPaint('lowerBack')} />

                    <ellipse cx="90" cy="224" rx="12" ry="16" {...getPaint('glutes')} />
                    <ellipse cx="110" cy="224" rx="12" ry="16" {...getPaint('glutes')} />

                    <rect x="82" y="238" width="17" height="82" rx="8.5" {...getPaint('hamstrings')} />
                    <rect x="101" y="238" width="17" height="82" rx="8.5" {...getPaint('hamstrings')} />

                    <rect x="84" y="320" width="13" height="30" rx="6.5" {...getPaint('calves')} />
                    <rect x="103" y="320" width="13" height="30" rx="6.5" {...getPaint('calves')} />
                </>
            )}

            <text
                x="100"
                y="354"
                textAnchor="middle"
                className="fill-neutral-500 text-[10px] font-bold uppercase tracking-[0.22em]"
            >
                {activeSide} view
            </text>
        </svg>
    );
}
