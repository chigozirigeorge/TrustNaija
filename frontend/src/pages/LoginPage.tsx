import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Phone, KeyRound, ArrowRight } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { requestOtp, verifyOtp } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

export function LoginPage() {
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [autoSubmitting, setAutoSubmitting] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const { register: regPhone, handleSubmit: handlePhone, formState: { isSubmitting: submittingPhone }, reset: resetPhone } = useForm<{ phone: string }>()
  const { register: regOtp, handleSubmit: handleOtp, formState: { isSubmitting: submittingOtp }, watch: watchOtp } = useForm<{ otp: string }>()

  const otpValue = watchOtp('otp')

  // Auto-submit when OTP reaches 6 digits
  useEffect(() => {
    if (otpValue && otpValue.length === 6 && !autoSubmitting && !submittingOtp) {
      setAutoSubmitting(true)
      handleOtp(async (data) => {
        setError('')
        try {
          const auth = await verifyOtp(phone, data.otp)
          login(auth)
          navigate('/')
        } catch {
          setError('Invalid or expired OTP. Please try again.')
          setAutoSubmitting(false)
        }
      })()
    }
  }, [otpValue, autoSubmitting, submittingOtp, phone, handleOtp, login, navigate])

  const onPhoneSubmit = async (data: { phone: string }) => {
    setError('')
    try {
      await requestOtp(data.phone)
      setPhone(data.phone)
      resetPhone()
      setStep('otp')
    } catch {
      setError('Could not send OTP. Please check the number and try again.')
    }
  }

  const onOtpSubmit = async (data: { otp: string }) => {
    setError('')
    try {
      const auth = await verifyOtp(phone, data.otp)
      login(auth)
      navigate('/')
    } catch {
      setError('Invalid or expired OTP. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 justify-center mb-12">
          <div className="relative w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center shadow-lg shadow-signal-500/30">
            <img 
              src='/logo.png' 
              alt='TrustNaija Logo' 
              className='w-full h-full object-cover'
            />
            <div className="absolute inset-0 rounded-lg bg-gradient-to-tr from-signal-500/20 to-transparent pointer-events-none" />
          </div>
          <span className="font-display font-bold text-white text-2xl">Trust<span className="text-signal-400">Naija</span></span>
        </div>

        <div className="bg-navy-900/70 border border-white/[0.07] rounded-2xl p-8">
          <h1 className="text-xl font-display font-bold text-white mb-1">
            {step === 'phone' ? 'Sign In' : 'Verify OTP'}
          </h1>
          <p className="text-sm text-slate-400 font-body mb-6">
            {step === 'phone'
              ? 'Enter your Nigerian phone number to receive an OTP.'
              : `We sent a 6-digit code to ${phone}`}
          </p>

          {step === 'phone' ? (
            <form onSubmit={handlePhone(onPhoneSubmit)} className="space-y-4">
              <Input
                label="Phone Number"
                placeholder="08012345678"
                type="tel"
                leftIcon={<Phone className="w-4 h-4" />}
                {...regPhone('phone', { required: 'Phone number required' })}
              />
              {error && <p className="text-xs text-danger-400">{error}</p>}
              <Button type="submit" variant="primary" size="lg" className="w-full" loading={submittingPhone}>
                Send OTP
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          ) : (
            <form onSubmit={handleOtp(onOtpSubmit)} className="space-y-4">
              <Input
                label="6-Digit OTP"
                placeholder="123456"
                maxLength={6}
                leftIcon={<KeyRound className="w-4 h-4" />}
                {...regOtp('otp', { required: 'OTP required', minLength: 6, maxLength: 6 })}
              />
              {error && <p className="text-xs text-danger-400">{error}</p>}
              <Button type="submit" variant="primary" size="lg" className="w-full" loading={submittingOtp}>
                Verify & Sign In
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => setStep('phone')}>
                Use different number
              </Button>
            </form>
          )}

          {/* Auto-submit indicator */}
          {step === 'otp' && otpValue?.length === 6 && (
            <div className="mt-4 p-3 rounded-lg bg-signal-500/10 border border-signal-500/30 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-signal-400 animate-pulse" />
              <p className="text-xs text-signal-300 font-body">Verifying OTP...</p>
            </div>
          )}
        </div>

        <p className="text-xs text-slate-600 text-center mt-6 font-body">
          By signing in you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}
