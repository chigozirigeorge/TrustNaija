import React, { useState } from 'react'
import { RefreshCw, TrendingUp, AlertCircle, Zap, Brain } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { trainMLModel, analyzePatterns, predictWave, getForecast } from '@/lib/api'

export interface MLAnalytics {
  patterns_detected: number
  high_risk_patterns: number
  patterns: Array<{
    pattern_type: string
    confidence: number
    description: string
  }>
  predictions?: {
    predicted_scam_type: string
    confidence: number
    predicted_volume: number
    predicted_start_date: string
  }
  forecast?: Record<string, number>
}

interface MLDashboardProps {
  authToken?: string
}

export function MLDashboard({ authToken }: MLDashboardProps) {
  const [analytics, setAnalytics] = useState<MLAnalytics | null>(null)
  const [predictions, setPredictions] = useState<any>(null)
  const [forecast, setForecast] = useState<Record<string, number> | null>(null)
  const [loading, setLoading] = useState(false)
  const [trainingModel, setTrainingModel] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleTrainModel = async () => {
    setTrainingModel(true)
    setError(null)
    try {
      await trainMLModel()
      // Refresh analytics after training
      handleAnalyze()
    } catch (err: any) {
      setError('Failed to train model')
      console.error(err)
    } finally {
      setTrainingModel(false)
    }
  }

  const handleAnalyze = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await analyzePatterns(24)
      setAnalytics(data)
    } catch (err: any) {
      setError('Failed to analyze patterns')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handlePredict = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await predictWave()
      setPredictions(data)
    } catch (err: any) {
      setError('Failed to predict wave')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleForecast = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getForecast()
      setForecast(data.forecast)
    } catch (err: any) {
      setError('Failed to load forecast')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 rounded-xl bg-danger-500/10 border border-danger-500/30">
          <p className="text-sm text-danger-300">{error}</p>
        </div>
      )}

      {/* ML Controls */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant="primary"
          size="sm"
          loading={trainingModel}
          onClick={handleTrainModel}
          className="flex items-center gap-2"
        >
          <Brain className="w-4 h-4" />
          Train Model
        </Button>
        <Button
          variant="secondary"
          size="sm"
          loading={loading}
          onClick={handleAnalyze}
          className="flex items-center gap-2"
        >
          <TrendingUp className="w-4 h-4" />
          Analyze Patterns
        </Button>
        <Button
          variant="secondary"
          size="sm"
          loading={loading}
          onClick={handlePredict}
          className="flex items-center gap-2"
        >
          <Zap className="w-4 h-4" />
          Predict Wave
        </Button>
        <Button
          variant="secondary"
          size="sm"
          loading={loading}
          onClick={handleForecast}
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Volume Forecast
        </Button>
      </div>

      {/* Detected Patterns */}
      {analytics && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-warning-400" />
            <h3 className="text-sm font-display font-semibold text-white">
              Detected Patterns ({analytics.patterns_detected})
            </h3>
            {analytics.high_risk_patterns > 0 && (
              <span className="ml-auto px-2 py-1 rounded-full bg-danger-500/20 text-danger-300 text-xs font-semibold">
                {analytics.high_risk_patterns} High Risk
              </span>
            )}
          </div>

          <div className="space-y-2">
            {analytics.patterns.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No patterns detected in this period</p>
            ) : (
              analytics.patterns.map((pattern, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-navy-800/50 border border-white/[0.06]"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-slate-300">
                          {pattern.pattern_type.replace(/_/g, ' ')}
                        </span>
                        <div className="flex-1 h-1.5 bg-navy-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              pattern.confidence > 0.7
                                ? 'bg-danger-500'
                                : pattern.confidence > 0.4
                                ? 'bg-warning-500'
                                : 'bg-slate-500'
                            }`}
                            style={{ width: `${pattern.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 font-mono w-10 text-right">
                          {(pattern.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{pattern.description}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Wave Prediction */}
      {predictions?.prediction && (
        <Card className="p-6">
          <h3 className="text-sm font-display font-semibold text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-signal-400" />
            Next Scam Wave Prediction
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-navy-800/50 border border-white/[0.06]">
              <p className="text-xs text-slate-500 font-body mb-1">Predicted Type</p>
              <p className="text-sm font-semibold text-white">
                {predictions.prediction.predicted_scam_type.replace(/_/g, ' ')}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-navy-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-signal-500 rounded-full"
                    style={{ width: `${predictions.prediction.confidence * 100}%` }}
                  />
                </div>
                <span className="text-xs text-slate-500 font-mono">
                  {(predictions.prediction.confidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-navy-800/50 border border-white/[0.06]">
              <p className="text-xs text-slate-500 font-body mb-1">Predicted Volume</p>
              <p className="text-sm font-semibold text-white">
                ~{predictions.prediction.predicted_volume} reports
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Duration: {predictions.prediction.predicted_duration_hours}h
              </p>
            </div>
          </div>

          {predictions.prediction.recommendations && (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-slate-500 font-semibold">Recommendations:</p>
              {predictions.prediction.recommendations.map((rec: string, idx: number) => (
                <div key={idx} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-signal-500 mt-1.5 flex-shrink-0" />
                  <p className="text-xs text-slate-400">{rec}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Volume Forecast */}
      {forecast && (
        <Card className="p-6">
          <h3 className="text-sm font-display font-semibold text-white mb-4">Volume Forecast (7 Days)</h3>

          <div className="space-y-3">
            {Object.entries(forecast)
              .sort(([, a], [, b]) => b - a)
              .map(([scamType, volume]) => (
                <div key={scamType} className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 font-body w-40 shrink-0">
                    {scamType.replace(/_/g, ' ')}
                  </span>
                  <div className="flex-1 h-2 bg-navy-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-signal-500 rounded-full"
                      style={{ width: `${Math.min((volume / 50) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-slate-400 w-12 text-right">{volume}</span>
                </div>
              ))}
          </div>
        </Card>
      )}
    </div>
  )
}
