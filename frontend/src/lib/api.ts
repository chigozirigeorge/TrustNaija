import axios from 'axios'
import type { LookupResult, AuthResponse, UserProfile } from '@/types'

// const apiUrl = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:3000/api'
const apiUrl = import.meta.env.VITE_API_URL || 
  (typeof window !== 'undefined' && window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api'
    : '/api')

const api = axios.create({
  baseURL: apiUrl,
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tn_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export async function lookup(identifier: string): Promise<LookupResult> {
  const { data } = await api.get('/lookup', { params: { identifier } })
  return data
}

export async function reportScam(payload: {
  type: string
  identifier: string
  description: string
  evidence?: string
}): Promise<{ id: string }> {
  const { data } = await api.post('/reports', payload)
  return data
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post('/auth/login', { username, password })
  return data
}

export async function getProfile(): Promise<UserProfile> {
  const { data } = await api.get('/me')
  return data
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout')
}

// Admin functions
export async function getPendingReports(limit = 20, offset = 0) {
  const { data } = await api.get('/admin/reports/pending', { params: { limit, offset } })
  return data
}

export async function getAllReports(limit = 20, offset = 0, status?: string) {
  const { data } = await api.get('/admin/reports', { params: { limit, offset, status } })
  return data
}

export async function moderateReport(id: string, action: 'approve' | 'reject', note?: string, tags?: string[]) {
  const { data } = await api.post(`/admin/reports/${id}/moderate`, { action, note, tags })
  return data
}

export async function getAuditLogs(limit = 50, offset = 0) {
  const { data } = await api.get('/admin/audit-logs', { params: { limit, offset } })
  return data
}

// Auth functions
export async function requestOtp(phone: string) {
  const { data } = await api.post('/auth/register', { phone })
  return data
}

export async function verifyOtp(phone: string, otp: string) {
  const { data } = await api.post('/auth/verify', { phone, otp })
  return data
}

// Report submission
export async function submitReport(report: any) {
  const { data } = await api.post('/report', report)
  return data
}

export default api
