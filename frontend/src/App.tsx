import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { HomePage } from '@/pages/HomePage'
import { ResultPage } from '@/pages/ResultPage'
import { ReportPage } from '@/pages/ReportPage'
import { EvidencePage } from '@/pages/EvidencePage'
import { UssdPage } from '@/pages/UssdPage'
import { AdminPage } from '@/pages/AdminPage'
import { LoginPage } from '@/pages/LoginPage'
import { PrivacyPolicy } from '@/pages/PrivacyPolicy'
import { TermsAndConditions } from '@/pages/TermsAndConditions'

// Protect admin routes
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAuth()
  if (loading) return <div className="min-h-screen bg-navy-950 flex items-center justify-center"><div className="w-6 h-6 rounded-full border-2 border-signal-500 border-t-transparent animate-spin" /></div>
  if (!isAdmin) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/result" element={<ResultPage />} />
      <Route path="/report" element={<ReportPage />} />
      <Route path="/evidence" element={<EvidencePage />} />
      <Route path="/ussd" element={<UssdPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsAndConditions />} />
      <Route path="/admin/*" element={<AdminRoute><AdminPage /></AdminRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
