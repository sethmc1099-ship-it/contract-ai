import { useState } from 'react'

const SEVERITY_STYLES = {
  low: {
    border: 'border-green-200',
    bg: 'bg-green-50',
    badge: 'bg-green-100 text-green-800',
    icon: 'text-green-500',
    dot: 'bg-green-500',
  },
  medium: {
    border: 'border-yellow-200',
    bg: 'bg-yellow-50',
    badge: 'bg-yellow-100 text-yellow-800',
    icon: 'text-yellow-500',
    dot: 'bg-yellow-500',
  },
  high: {
    border: 'border-orange-200',
    bg: 'bg-orange-50',
    badge: 'bg-orange-100 text-orange-800',
    icon: 'text-orange-500',
    dot: 'bg-orange-500',
  },
  critical: {
    border: 'border-red-200',
    bg: 'bg-red-50',
    badge: 'bg-red-100 text-red-800',
    icon: 'text-red-500',
    dot: 'bg-red-500',
  },
}

const TYPE_ICONS = {
  risk: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  opportunity: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  missing: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
  ),
  unusual: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
}

export default function FindingCard({ finding, index }) {
  const [expanded, setExpanded] = useState(false)
  const severity = finding.severity || 'low'
  const styles = SEVERITY_STYLES[severity] || SEVERITY_STYLES.low
  const typeIcon = TYPE_ICONS[finding.type] || TYPE_ICONS.risk

  return (
    <div className={`border rounded-xl overflow-hidden ${styles.border} transition-shadow hover:shadow-sm`}>
      <button
        className={`w-full text-left p-4 ${styles.bg} flex items-start gap-3`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className={`mt-0.5 flex-shrink-0 ${styles.icon}`}>
          {typeIcon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${styles.badge}`}>
              {severity}
            </span>
            {finding.type && (
              <span className="text-xs text-gray-500 capitalize">{finding.type}</span>
            )}
          </div>
          <h3 className="font-semibold text-gray-900 mt-1">{finding.title}</h3>
          {!expanded && finding.explanation && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{finding.explanation}</p>
          )}
        </div>
        <div className="flex-shrink-0 text-gray-400 mt-0.5">
          <svg className={`w-5 h-5 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="p-4 bg-white border-t border-gray-100 space-y-4">
          {finding.clause && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Contract Language</p>
              <blockquote className="border-l-4 border-gray-300 pl-3 text-sm text-gray-600 italic">
                "{finding.clause}"
              </blockquote>
            </div>
          )}
          {finding.explanation && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">What This Means</p>
              <p className="text-sm text-gray-700">{finding.explanation}</p>
            </div>
          )}
          {finding.recommendation && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Recommendation</p>
              <p className="text-sm text-blue-800">{finding.recommendation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
