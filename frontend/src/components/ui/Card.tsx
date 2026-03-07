import React from 'react'
import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  glow?: 'signal' | 'warning' | 'danger' | 'none'
}

export function Card({ children, className, glow = 'none' }: CardProps) {
  const glowStyles = {
    signal: 'border-signal-500/25 shadow-signal-500/10 shadow-lg',
    warning: 'border-amber-500/25 shadow-amber-500/10 shadow-lg',
    danger: 'border-danger-500/25 shadow-danger-500/10 shadow-lg',
    none: 'border-white/[0.07]',
  }

  return (
    <div className={cn(
      'rounded-xl border bg-navy-900/60 backdrop-blur-sm',
      glowStyles[glow],
      className
    )}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('px-6 py-5 border-b border-white/[0.06]', className)}>
      {children}
    </div>
  )
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('px-6 py-5', className)}>{children}</div>
}

export function StatCard({
  label,
  value,
  sublabel,
  icon,
  trend,
}: {
  label: string
  value: string | number
  sublabel?: string
  icon?: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-display font-semibold tracking-widest uppercase text-slate-500 mb-2">{label}</p>
          <p className="text-2xl font-display font-bold text-white">{value}</p>
          {sublabel && <p className="text-xs text-slate-500 mt-1">{sublabel}</p>}
        </div>
        {icon && (
          <div className="text-signal-500 bg-signal-500/10 p-2.5 rounded-lg">
            {icon}
          </div>
        )}
      </div>
    </Card>
  )
}
