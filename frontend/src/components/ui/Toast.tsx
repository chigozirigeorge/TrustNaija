import React, { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle, InfoIcon, XCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastProps {
  id: string
  type: ToastType
  message: string
  duration?: number
  onClose: (id: string) => void
}

export function Toast({ id, type, message, duration = 4000, onClose }: ToastProps) {
  useEffect(() => {
    if (duration) {
      const timer = setTimeout(() => onClose(id), duration)
      return () => clearTimeout(timer)
    }
  }, [duration, id, onClose])

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <XCircle className="w-5 h-5" />,
    warning: <AlertCircle className="w-5 h-5" />,
    info: <InfoIcon className="w-5 h-5" />,
  }

  const styles = {
    success: 'bg-signal-500/15 text-signal-300 border-signal-500/25',
    error: 'bg-danger-500/15 text-danger-300 border-danger-500/25',
    warning: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
    info: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
  }

  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-sm',
      'animate-in fade-in slide-in-from-top-4 duration-300',
      styles[type]
    )}>
      {icons[type]}
      <span className="flex-1 text-sm font-body">{message}</span>
      <button
        onClick={() => onClose(id)}
        className="p-1 hover:bg-white/10 rounded transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
