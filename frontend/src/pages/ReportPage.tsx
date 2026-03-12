import React, { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { CheckCircle, AlertTriangle, Phone, Globe, Wallet, Package, CreditCard, Building2, MessageSquare, ChevronRight, ChevronDown } from 'lucide-react'
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

// Grouped identifier types with dependencies
const IDENTIFIER_GROUPS = [
  {
    category: 'Contact',
    icon: Phone,
    types: [
      { value: 'phone', label: 'Phone Number', placeholder: '08012345678' },
    ]
  },
  {
    category: 'Web & Digital',
    icon: Globe,
    types: [
      { value: 'url', label: 'Website URL', placeholder: 'https://example.com' },
      { value: 'wallet', label: 'Crypto Wallet', placeholder: '0x1A2B3C...' },
      { value: 'app', label: 'App Package', placeholder: 'com.example.app' },
    ]
  },
  {
    category: 'Banking',
    icon: CreditCard,
    types: [
      { value: 'bank_account', label: 'Bank Account Number', placeholder: '1234567890' },
      { value: 'bank_name', label: 'Bank Name', placeholder: 'GTBank, Access Bank, etc.' },
    ]
  },
  {
    category: 'Business',
    icon: Building2,
    types: [
      { value: 'company_name', label: 'Company Name', placeholder: 'Company Legal Name' },
      { value: 'company_website', label: 'Company Website', placeholder: 'https://company.com' },
    ]
  },
  {
    category: 'Social Media',
    icon: MessageSquare,
    types: [
      { value: 'twitter', label: 'Twitter Handle', placeholder: '@username' },
      { value: 'instagram', label: 'Instagram Account', placeholder: '@username' },
      { value: 'tiktok', label: 'TikTok Account', placeholder: '@username' },
      { value: 'facebook', label: 'Facebook Account', placeholder: 'profile name or URL' },
      { value: 'whatsapp', label: 'WhatsApp Business', placeholder: '+234 phone or business ID' },
      { value: 'telegram', label: 'Telegram Channel', placeholder: '@channel_name' },
      { value: 'linkedin', label: 'LinkedIn Account', placeholder: 'username or profile URL' },
    ]
  },
]

const SCAM_OPTIONS = Object.entries(SCAM_TYPE_LABELS).map(([value, label]) => ({ value, label }))

type FormData = {
  identifier: string
  identifier_type: string
  bank_name?: string  // Dependent field when identifier_type is bank_account
  company_website?: string  // Dependent field when identifier_type is company_name
  scam_type: string
  description: string
  amount_lost_ngn: string
  reporter_phone: string
}

const NIGERIAN_BANKS = [
  'Access Bank',
  'FCMB',
  'First Bank',
  'Fidelity Bank',
  'GTBank',
  'Heritage Bank',
  'Keystone Bank',
  'Polaris Bank',
  'Stanbic IBTC',
  'Standard Chartered',
  'Sterling Bank',
  'UBA',
  'Union Bank',
  'Unity Bank',
  'WEMA Bank',
  'Zenith Bank',
  'Eco Bank',
  'Jaiz Bank',
  'Providus Bank',
  'Titan Trust',
  'Premium Trust',
  'Kuda Bank',
  'OPay',
  'Monie Point',
]

export function ReportPage() {
  const [searchParams] = useSearchParams()
  const prefilled = searchParams.get('identifier') || ''
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['Contact']))

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    defaultValues: {
      identifier: prefilled,
      identifier_type: prefilled ? detectIdentifierType(prefilled) : 'phone',
    },
  })

  const selectedType = watch('identifier_type')

  const toggleGroup = (category: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedGroups(newExpanded)
  }

  const getPlaceholder = (type: string) => {
    const allTypes = IDENTIFIER_GROUPS.flatMap(g => g.types)
    return allTypes.find(t => t.value === type)?.placeholder || 'Enter value'
  }

  const onSubmit = async (data: FormData) => {
    setSubmitError(null)
    try {
      const payload: any = {
        identifer: data.identifier,  // Note: backend has typo, expects 'identifer' not 'identifier'
        identifier_type: data.identifier_type,
        scam_type: data.scam_type,
        description: data.description || undefined,
        amount_lost_ngn: data.amount_lost_ngn ? parseFloat(data.amount_lost_ngn) : undefined,
        reporter_phone: data.reporter_phone || undefined,
      }

      // Add dependent fields if they exist
      if (data.bank_name) {
        payload.bank_name = data.bank_name
      }
      if (data.company_website) {
        payload.company_website = data.company_website
      }

      await submitReport(payload)
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
          {/* Identifier type selector - Grouped */}
          <div>
            <p className="text-xs font-display font-semibold tracking-widest uppercase text-slate-400 mb-4">
              What are you reporting?
            </p>
            <div className="space-y-3">
              {IDENTIFIER_GROUPS.map((group) => {
                const Icon = group.icon
                const isExpanded = expandedGroups.has(group.category)
                const isSelected = group.types.some(t => t.value === selectedType)

                return (
                  <div key={group.category}>
                    {/* Group header - clickable to expand/collapse */}
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.category)}
                      className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-signal-500/15 border-signal-500/40'
                          : 'bg-navy-900/50 border-white/8 hover:border-white/20'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-signal-400' : 'text-slate-500'}`} />
                      <span className={`flex-1 text-left text-sm font-display font-semibold ${isSelected ? 'text-signal-300' : 'text-slate-300'}`}>
                        {group.category}
                      </span>
                      <div className={`text-xs text-slate-500 ${isSelected ? 'text-signal-400' : ''}`}>
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                    </button>

                    {/* Expanded options */}
                    {isExpanded && (
                      <div className="mt-2 ml-6 space-y-2 pl-4 border-l border-white/10">
                        {group.types.map(({ value, label }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => {
                              setValue('identifier_type', value)
                              // Auto-expand parent group on selection
                              if (!isExpanded) toggleGroup(group.category)
                            }}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg border text-sm font-display font-medium transition-all ${
                              selectedType === value
                                ? 'bg-signal-500/20 border-signal-500/50 text-signal-300'
                                : 'bg-navy-800/30 border-white/5 text-slate-400 hover:border-white/15 hover:text-slate-200'
                            }`}
                          >
                            <div className={`w-2 h-2 rounded-full ${selectedType === value ? 'bg-signal-400' : 'bg-slate-600'}`} />
                            <span>{label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <Input
            label="Identifier to Report"
            placeholder={getPlaceholder(selectedType)}
            error={errors.identifier?.message}
            hint="Enter the identifier you're reporting"
            {...register('identifier', { required: 'Identifier is required', minLength: { value: 2, message: 'Too short' } })}
          />

          {/* Dependent Fields */}
          {selectedType === 'bank_account' && (
            <Select
              label="Which Bank?"
              placeholder="Select the bank…"
              options={NIGERIAN_BANKS.map(bank => ({ value: bank, label: bank }))}
              error={errors.bank_name?.message}
              {...register('bank_name', { required: 'Please select a bank' })}
            />
          )}

          {selectedType === 'company_name' && (
            <Input
              label="Company Website (Optional)"
              placeholder="https://company.com"
              hint="If you also know the company's website, enter it here"
              {...register('company_website')}
            />
          )}

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
