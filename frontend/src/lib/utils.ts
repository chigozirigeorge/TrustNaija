import { clsx, type ClassValue } from 'clsx'
import type { RiskLevel } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function getRiskColor(level: RiskLevel): string {
  const map: Record<RiskLevel, string> = {
    LOW: '#0FA958',
    MEDIUM: '#F4A300',
    HIGH: '#D92D20',
    CRITICAL: '#B91C1C',
  }
  return map[level]
}

export function getRiskLabel(score: number): RiskLevel {
  if (score >= 90) return 'CRITICAL'
  if (score >= 70) return 'HIGH'
  if (score >= 40) return 'MEDIUM'
  return 'LOW'
}

export function formatDate(iso: string | null): string {
  if (!iso) return 'N/A'
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatPhoneDisplay(phone: string): string {
  // Mask middle digits: +234****5678
  if (phone.length < 8) return phone
  const last4 = phone.slice(-4)
  return `${phone.slice(0, 4)}****${last4}`
}

export function detectIdentifierType(value: string): string {
  const trimmed = value.trim()
  if (/^(\+?234|0)[789]\d{9}$/.test(trimmed.replace(/\s/g, ''))) return 'phone'
  if (/^0x[0-9a-fA-F]{40}$/.test(trimmed)) return 'wallet'
  if (/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(trimmed) && !trimmed.includes('/')) return 'app'
  if (trimmed.includes('.') || trimmed.startsWith('http')) return 'url'
  return 'phone'
}

export function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? `${str.slice(0, maxLen)}…` : str
}
