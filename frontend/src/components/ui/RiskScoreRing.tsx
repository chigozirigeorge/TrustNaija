import React, { useEffect, useState } from 'react'
import type { RiskLevel } from '@/types'
import { getRiskColor } from '@/lib/utils'

interface RiskScoreRingProps {
  score: number
  level: RiskLevel
  size?: number
}

export function RiskScoreRing({ score, level, size = 140 }: RiskScoreRingProps) {
  const [animatedScore, setAnimatedScore] = useState(0)
  const radius = 46
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference
  const color = getRiskColor(level)

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedScore(score)
    }, 100)
    return () => clearTimeout(timer)
  }, [score])

  const levelLabels: Record<RiskLevel, string> = {
    LOW: 'Low Risk',
    MEDIUM: 'Medium Risk',
    HIGH: 'High Risk',
    CRITICAL: 'Critical',
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 100 100" className="transform -rotate-90">
          {/* Background track */}
          <circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="7"
          />
          {/* Score arc */}
          <circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="score-ring"
            style={{ filter: `drop-shadow(0 0 6px ${color}60)` }}
          />
        </svg>
        {/* Center display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-display font-bold text-white leading-none">
            {score}
          </span>
          <span className="text-[10px] font-display tracking-widest uppercase text-slate-500 mt-0.5">
            /100
          </span>
        </div>
      </div>
      <span
        className="text-sm font-display font-semibold tracking-wide"
        style={{ color }}
      >
        {levelLabels[level]}
      </span>
    </div>
  )
}
