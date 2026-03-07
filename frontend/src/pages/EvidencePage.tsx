import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, File, X, Download, Image, FileText, Shield } from 'lucide-react'
import { PageLayout } from '@/components/layout/PageLayout'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface EvidenceFile {
  id: string
  file: File
  preview?: string
  type: 'image' | 'document'
  uploadedAt: Date
}

export function EvidencePage() {
  const [files, setFiles] = useState<EvidenceFile[]>([])
  const [description, setDescription] = useState('')

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: EvidenceFile[] = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).slice(2),
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      type: file.type.startsWith('image/') ? 'image' : 'document',
      uploadedAt: new Date(),
    }))
    setFiles((prev) => [...prev, ...newFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
      'application/pdf': ['.pdf'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 20,
  })

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const handleDownloadSummary = () => {
    const summary = {
      generated: new Date().toISOString(),
      description,
      file_count: files.length,
      files: files.map((f) => ({
        name: f.file.name,
        size: f.file.size,
        type: f.file.type,
        uploaded: f.uploadedAt.toISOString(),
      })),
    }
    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trustnaija-evidence-${Date.now()}.json`
    a.click()
  }

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <div className="mb-10">
          <p className="text-xs font-display font-semibold tracking-widest uppercase text-signal-500 mb-3">Evidence Vault</p>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-white mb-3">
            Secure Evidence Storage
          </h1>
          <p className="text-slate-400 font-body max-w-xl">
            Upload screenshots, transaction receipts, and chat logs to support your report. Evidence can be shared with banks or EFCC.
          </p>
        </div>

        {/* Privacy notice */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-navy-800/50 border border-white/8 mb-8">
          <Shield className="w-4 h-4 text-signal-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-400 font-body leading-relaxed">
            <span className="text-white font-semibold">Privacy protected:</span> Evidence files are encrypted at rest and never shared without your consent. No raw content is stored in our database — only metadata and secure file references.
          </p>
        </div>

        {/* Description field */}
        <div className="mb-6">
          <label className="block text-xs font-display font-semibold tracking-widest uppercase text-slate-400 mb-2">
            Case Description
          </label>
          <textarea
            rows={3}
            placeholder="Briefly describe this evidence package — e.g. 'Screenshots of investment scam conversation with 08012345678'"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-navy-900/80 border border-white/10 text-white placeholder:text-slate-600 rounded-lg px-4 py-3 text-sm font-body resize-none focus:outline-none focus:border-signal-500/50 focus:ring-1 focus:ring-signal-500/20"
          />
        </div>

        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200',
            isDragActive
              ? 'border-signal-500/60 bg-signal-500/8'
              : 'border-white/15 hover:border-white/25 bg-navy-900/30 hover:bg-navy-900/50'
          )}
        >
          <input {...getInputProps()} />
          <Upload className={cn('w-8 h-8 mx-auto mb-4', isDragActive ? 'text-signal-400' : 'text-slate-600')} />
          <p className="text-sm font-display font-semibold text-white mb-1">
            {isDragActive ? 'Drop files here' : 'Drop files or click to upload'}
          </p>
          <p className="text-xs text-slate-500 font-body">
            PNG, JPG, WEBP, PDF · Max 10MB per file · Up to 20 files
          </p>
        </div>

        {/* File grid */}
        {files.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-display font-semibold text-white">
                {files.length} file{files.length !== 1 ? 's' : ''} ready
              </h3>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={handleDownloadSummary}>
                  <Download className="w-3.5 h-3.5" />
                  Download Summary
                </Button>
                <Button variant="primary" size="sm">
                  <Upload className="w-3.5 h-3.5" />
                  Submit Evidence
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {files.map((f) => (
                <div key={f.id} className="relative group rounded-xl overflow-hidden bg-navy-900/60 border border-white/8 hover:border-white/15 transition-all">
                  {f.preview ? (
                    <div className="aspect-square">
                      <img src={f.preview} alt={f.file.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="aspect-square flex flex-col items-center justify-center">
                      <FileText className="w-8 h-8 text-slate-500" />
                    </div>
                  )}
                  <div className="p-2.5">
                    <p className="text-xs text-white font-body truncate">{f.file.name}</p>
                    <p className="text-xs text-slate-500">{(f.file.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button
                    onClick={() => removeFile(f.id)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-navy-950/90 border border-white/15 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-danger-500"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  )
}
