"use client";

import { useEffect, useState } from "react";

interface FearGreedGaugeProps {
  value: number | null;
  size?: "sm" | "md";
}

/**
 * Semi-circle gauge with 5 equal colored segments for Fear & Greed Index
 * Shows the value number inside the active segment
 * Needle animates from 0 to current value on mount
 */
export function FearGreedGauge({ value, size = "md" }: FearGreedGaugeProps) {
  const targetValue = value ?? 50;
  const [animatedValue, setAnimatedValue] = useState(0);

  // Animate needle from 0 to target value
  useEffect(() => {
    // Start from 0 - intentional animation reset
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnimatedValue(0);

    // Small delay before starting animation
    const startDelay = setTimeout(() => {
      const duration = 1000; // 1 second animation
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function (ease-out cubic)
        const eased = 1 - Math.pow(1 - progress, 3);

        setAnimatedValue(eased * targetValue);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }, 200);

    return () => clearTimeout(startDelay);
  }, [targetValue]);

  // Size configurations - thinner segments
  const config = size === "sm"
    ? { width: 120, height: 78, outerR: 52, innerR: 36, needleLength: 44 }
    : { width: 140, height: 90, outerR: 60, innerR: 42, needleLength: 52 };

  const { width, height, outerR, innerR, needleLength } = config;
  const cx = width / 2;
  const cy = height - 10;

  // Gap between segments in degrees
  const gapDegrees = 1.5;

  // 5 equal segments (36° each, minus gaps)
  const segmentDegrees = (180 - gapDegrees * 4) / 5;

  // Calculate needle angle: 0 = 180° (left), 100 = 0° (right)
  const needleAngle = 180 - (animatedValue / 100) * 180;
  const needleRad = (needleAngle * Math.PI) / 180;
  const needleTipX = cx + needleLength * Math.cos(needleRad);
  const needleTipY = cy - needleLength * Math.sin(needleRad);

  // Determine which segment the value falls into (for displaying number)
  const getActiveSegment = (val: number): number => {
    if (val < 20) return 0;
    if (val < 40) return 1;
    if (val < 60) return 2;
    if (val < 80) return 3;
    return 4;
  };
  const activeSegment = getActiveSegment(targetValue);

  // Create arc segment path
  const createArcSegment = (startDeg: number, endDeg: number) => {
    const startRad = (startDeg * Math.PI) / 180;
    const endRad = (endDeg * Math.PI) / 180;

    const outerStart = {
      x: cx + outerR * Math.cos(startRad),
      y: cy - outerR * Math.sin(startRad),
    };
    const outerEnd = {
      x: cx + outerR * Math.cos(endRad),
      y: cy - outerR * Math.sin(endRad),
    };
    const innerStart = {
      x: cx + innerR * Math.cos(startRad),
      y: cy - innerR * Math.sin(startRad),
    };
    const innerEnd = {
      x: cx + innerR * Math.cos(endRad),
      y: cy - innerR * Math.sin(endRad),
    };

    return `
      M ${outerStart.x} ${outerStart.y}
      A ${outerR} ${outerR} 0 0 1 ${outerEnd.x} ${outerEnd.y}
      L ${innerEnd.x} ${innerEnd.y}
      A ${innerR} ${innerR} 0 0 0 ${innerStart.x} ${innerStart.y}
      Z
    `;
  };

  // Calculate center point of a segment for text placement
  const getSegmentCenter = (startDeg: number, endDeg: number) => {
    const midAngle = (startDeg + endDeg) / 2;
    const midR = (outerR + innerR) / 2;
    const rad = (midAngle * Math.PI) / 180;
    return {
      x: cx + midR * Math.cos(rad),
      y: cy - midR * Math.sin(rad),
    };
  };

  // Build segments with gaps
  const segments = [
    { color: "#DC2626" },  // Extreme Fear (red)
    { color: "#F97316" },  // Fear (orange)
    { color: "#E7F60E" },  // Neutral (signature yellow)
    { color: "#84CC16" },  // Greed (lime)
    { color: "#22C55E" },  // Extreme Greed (green)
  ].map((seg, i) => {
    const startDeg = 180 - i * (segmentDegrees + gapDegrees);
    const endDeg = startDeg - segmentDegrees;
    return {
      ...seg,
      path: createArcSegment(startDeg, endDeg),
      center: getSegmentCenter(startDeg, endDeg),
      index: i,
    };
  });

  // Needle shape - tapered with circle base
  const needleWidth = 6;
  const perpAngle = needleRad + Math.PI / 2;
  const baseLeft = {
    x: cx + (needleWidth / 2) * Math.cos(perpAngle),
    y: cy - (needleWidth / 2) * Math.sin(perpAngle),
  };
  const baseRight = {
    x: cx - (needleWidth / 2) * Math.cos(perpAngle),
    y: cy + (needleWidth / 2) * Math.sin(perpAngle),
  };

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Gauge segments */}
      {segments.map((segment) => (
        <path
          key={segment.index}
          d={segment.path}
          fill={segment.color}
        />
      ))}

      {/* Value text on active segment */}
      {segments.map((segment) => (
        segment.index === activeSegment && (
          <text
            key={`text-${segment.index}`}
            x={segment.center.x}
            y={segment.center.y}
            textAnchor="middle"
            dominantBaseline="central"
            fill="white"
            fontSize={size === "sm" ? 12 : 14}
            fontWeight="500"
          >
            {targetValue}
          </text>
        )
      ))}

      {/* Tapered needle */}
      <polygon
        points={`${needleTipX},${needleTipY} ${baseLeft.x},${baseLeft.y} ${baseRight.x},${baseRight.y}`}
        fill="#9CA3AF"
      />

      {/* Center circle with white dot */}
      <circle cx={cx} cy={cy} r={8} fill="#9CA3AF" />
      <circle cx={cx} cy={cy} r={3} fill="white" />
    </svg>
  );
}
