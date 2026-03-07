import React, { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { CheckCircle, AlertTriangle, Phone, Globe, Wallet, Package, ChevronRight } from 'lucide-react'
import { PageLayout } from '@/components/layout/PageLayout'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { submitReport } from '@/lib/api'
import { detectIdentifierType } from '@/lib/utils'
import type { ReportFormData } from '@/types'

const SCAM_TYPE_LABELS: Record<string, string> = {
  romance: 'Romance Scam',
  investment: 'Investment / Ponzi',
  phishing: 'Phishing',
  impersonation: 'Impersonation (Bank/EFCC)',
  online_shopping: 'Online Shopping Fraud',
  job_offer: 'Fake Job Offer',
  loan_fraud: 'Loan Fraud',
  other: 'Other',
}

const IDENTIFIER_TYPES = [
  { value: 'phone', label: 'Phone', icon: Phone },
  { value: 'url', label: 'URL', icon: Globe },
  { value: 'wallet', label: 'Wallet', icon: Wallet },
  { value: 'app', label: 'App', icon: Package },
]

const SCAM_OPTIONS = Object.entries(SCAM_TYPE_LABELS).map(([value, label]) => ({ value, label }))

type FormData = {
  identifier: string
  identifier_type: string
  scam_type: string
  description: string
  amount_lost_ngn: string
  reporter_phone: string
}

export function ReportPage() {
  const [searchParams] = useSearchParams()
  const prefilled = searchParams.get('identifier') || ''
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    defaultValues: {
      identifier: prefilled,
      identifier_type: prefilled ? detectIdentifierType(prefilled) : 'phone',
    },
  })

  const selectedType = watch('identifier_type')

  const onSubmit = async (data: FormData) => {
    setSubmitError(null)
    try {
      await submitReport({
        identifer: data.identifier,  // Note: backend has typo, expects 'identifer' not 'identifier'
        identifier_type: data.identifier_type,
        scam_type: data.scam_type,
        description: data.description || undefined,
        amount_lost_ngn: data.amount_lost_ngn ? parseFloat(data.amount_lost_ngn) : undefined,
        reporter_phone: data.reporter_phone || undefined,
      })
      setSubmitted(true)
    } catch (err: any) {
      setSubmitError(err.response?.data?.error?.message || 'Failed to submit report. Please try again.')
    }
  }

  if (submitted) {
    return (
      <PageLayout>
        <div className="max-w-lg mx-auto px-4 py-24 text-center">
          <div className="w-20 h-20 rounded-full bg-signal-500/15 border border-signal-500/30 flex items-center justify-center mx-auto mb-6 glow-signal">
            <CheckCircle className="w-10 h-10 text-signal-400" />
          </div>
          <h1 className="text-3xl font-display font-bold text-white mb-4">Report Submitted</h1>
          <p className="text-slate-400 font-body mb-8 leading-relaxed">
            Thank you for protecting Nigerians from fraud. Your report has been received and will be reviewed by our moderation team.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="primary" onClick={() => setSubmitted(false)}>Submit Another</Button>
            <Button variant="ghost" onClick={() => window.location.href = '/'}>Back to Home</Button>
          </div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        <div className="mb-10">
          <p className="text-xs font-display font-semibold tracking-widest uppercase text-signal-500 mb-3">Report a Scam</p>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-white mb-3">
            Help Protect Nigeria
          </h1>
          <p className="text-slate-400 font-body">
            Your report helps warn others. All reports are reviewed by our moderation team.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Identifier type selector */}
          <div>
            <p className="text-xs font-display font-semibold tracking-widest uppercase text-slate-400 mb-3">
              What are you reporting?
            </p>
            <div className="grid grid-cols-4 gap-2">
              {IDENTIFIER_TYPES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setValue('identifier_type', value)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-xs font-display font-semibold transition-all duration-150 ${
                    selectedType === value
                      ? 'bg-signal-500/15 border-signal-500/40 text-signal-300'
                      : 'bg-navy-900/50 border-white/8 text-slate-400 hover:border-white/20 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Identifier to Report"
            placeholder={
              selectedType === 'phone' ? 'e.g. 08012345678' :
              selectedType === 'url' ? 'e.g. fake-bank.ng/transfer' :
              selectedType === 'wallet' ? 'e.g. 0xAbCd...' :
              'e.g. com.fake.bankapp'
            }
            error={errors.identifier?.message}
            hint="Enter the exact phone number, URL, wallet address, or app package being reported"
            {...register('identifier', { required: 'Identifier is required', minLength: { value: 3, message: 'Too short' } })}
          />

          <Select
            label="Type of Scam"
            placeholder="Select scam type…"
            options={SCAM_OPTIONS}
            error={errors.scam_type?.message}
            {...register('scam_type', { required: 'Please select a scam type' })}
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-display font-semibold tracking-widest uppercase text-slate-400">
              Description <span className="text-slate-600 normal-case font-body font-normal">(optional)</span>
            </label>
            <textarea
              rows={4}
              placeholder="Describe how the scam works, what happened, any additional details that could help others…"
              className="w-full bg-navy-900/80 border border-white/10 text-white placeholder:text-slate-600 rounded-lg px-4 py-3 text-sm font-body resize-none transition-all focus:outline-none focus:border-signal-500/50 focus:ring-1 focus:ring-signal-500/20"
              {...register('description')}
            />
          </div>

          <Input
            label="Amount Lost (₦)"
            type="number"
            placeholder="e.g. 50000"
            hint="Enter the total amount lost in Naira (optional)"
            {...register('amount_lost_ngn', { min: { value: 0, message: 'Must be positive' } })}
          />

          <Input
            label="Your Phone Number"
            placeholder="08012345678"
            hint="Optional. We may contact you for more information. Never shown publicly."
            {...register('reporter_phone')}
          />

          {submitError && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-danger-500/10 border border-danger-500/25">
              <AlertTriangle className="w-4 h-4 text-danger-400 shrink-0" />
              <p className="text-sm text-danger-300 font-body">{submitError}</p>
            </div>
          )}

          <Button type="submit" variant="primary" size="lg" loading={isSubmitting} className="w-full">
            Submit Report
            <ChevronRight className="w-4 h-4" />
          </Button>

          <p className="text-xs text-slate-600 font-body text-center">
            By submitting you confirm this information is accurate to the best of your knowledge.
          </p>
        </form>
      </div>
    </PageLayout>
  )
}
