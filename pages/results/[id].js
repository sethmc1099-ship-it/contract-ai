import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'
import Layout from '../../components/Layout'
import RiskGauge from '../../components/RiskGauge'
import FindingCard from '../../components/FindingCard'

export async function getServerSideProps({ params }) {
  const { id } = params

  try {
    const { getDb } = require('../../lib/db')
    const db = getDb()

    const review = db.prepare(`SELECT * FROM reviews WHERE id = ?`).get(id)

    if (!review) {
      return { notFound: true }
    }

    if (!review.paid) {
      return {
        redirect: { destination: `/pay/${id}`, permanent: false },
      }
    }

    if (review.status !== 'complete' || !review.result_json) {
      return {
        props: {
          review: { id: review.id, document_name: review.document_name, status: review.status, paid: review.paid },
          result: null,
          processing: true,
        },
      }
    }

    const { logEvent } = require('../../lib/db')
    logEvent('view_result', id, review.variant, null)

    return {
      props: {
        review: { id: review.id, document_name: review.document_name, status: review.status, rating: review.rating },
        result: JSON.parse(review.result_json),
        processing: false,
      },
    }
  } catch (err) {
    console.error('Results SSR error:', err)
    return { notFound: true }
  }
}

function StarRating({ reviewId, existingRating }) {
  const [rating, setRating] = useState(existingRating || 0)
  const [hover, setHover] = useState(0)
  const [submitted, setSubmitted] = useState(!!existingRating)
  const [submitting, setSubmitting] = useState(false)

  const handleRate = async (stars) => {
    if (submitted) return
    setSubmitting(true)
    try {
      await fetch('/api/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_id: reviewId, rating: stars }),
      })
      setRating(stars)
      setSubmitted(true)
    } catch (e) {}
    setSubmitting(false)
  }

  return (
    <div className="text-center">
      {!submitted ? (
        <>
          <p className="text-sm font-medium text-gray-700 mb-2">How helpful was this review?</p>
          <div className="flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                onMouseEnter={() => setHover(star)}
                onMouseLeave={() => setHover(0)}
                onClick={() => handleRate(star)}
                disabled={submitting}
                className="transition-transform hover:scale-110 disabled:opacity-50"
              >
                <svg
                  className="w-8 h-8"
                  fill={(hover || rating) >= star ? '#f59e0b' : 'none'}
                  stroke={(hover || rating) >= star ? '#f59e0b' : '#d1d5db'}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-600">
          Thanks for rating! You gave this review <span className="font-semibold">{rating}/5 stars</span>.
        </p>
      )}
    </div>
  )
}

export default function ResultsPage({ review, result, processing }) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '')

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'My ContractAI Review',
        url: `${window.location.origin}/results/${review.id}`,
      })
    } else {
      navigator.clipboard.writeText(`${window.location.origin}/results/${review.id}`)
      alert('Link copied to clipboard!')
    }
  }

  if (processing) {
    return (
      <Layout>
        <Head><title>Processing Your Review — ContractAI</title></Head>
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse" style={{ backgroundColor: '#d1fae5' }}>
            <svg className="w-10 h-10" style={{ color: '#10b981' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Analyzing Your Contract</h1>
          <p className="text-gray-600 mb-6">Our AI is reading through every clause. This usually takes 30-60 seconds.</p>
          <div className="w-full max-w-sm mx-auto bg-gray-200 rounded-full h-2 mb-4">
            <div className="h-2 rounded-full animate-pulse" style={{ width: '60%', backgroundColor: '#10b981' }} />
          </div>
          <p className="text-sm text-gray-500">This page will automatically refresh when your review is ready.</p>
          <p className="text-xs text-gray-400 mt-8">Review ID: {review.id}</p>
        </div>
        <script dangerouslySetInnerHTML={{ __html: `setTimeout(() => location.reload(), 5000)` }} />
      </Layout>
    )
  }

  if (!result) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Review Not Found</h1>
          <p className="text-gray-600 mb-6">We couldn't find your review. Please contact support.</p>
          <Link href="/" className="text-white font-bold py-3 px-6 rounded-xl" style={{ backgroundColor: '#10b981' }}>Go Home</Link>
        </div>
      </Layout>
    )
  }

  const riskColorMap = {
    Low: '#10b981',
    Medium: '#f59e0b',
    High: '#f97316',
    Critical: '#ef4444',
    Unknown: '#6b7280',
  }
  const riskColor = riskColorMap[result.overall_risk] || '#6b7280'

  return (
    <Layout>
      <Head>
        <title>Contract Review Results — {review.document_name} — ContractAI</title>
      </Head>

      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
          <div>
            <p className="text-sm text-gray-500 mb-1">Contract Review Report</p>
            <h1 className="text-2xl font-bold text-gray-900 truncate max-w-xs md:max-w-lg">{review.document_name}</h1>
            <p className="text-sm text-gray-500 mt-1">{result.document_type}</p>
          </div>
          <button
            onClick={handleShare}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share Report
          </button>
        </div>

        {/* Risk overview card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 shadow-sm">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-shrink-0">
              <RiskGauge score={result.risk_score} overall={result.overall_risk} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Overall Risk</span>
                <span
                  className="text-sm font-bold px-3 py-1 rounded-full"
                  style={{ color: riskColor, backgroundColor: riskColor + '20' }}
                >
                  {result.overall_risk}
                </span>
              </div>
              <h2 className="text-sm font-semibold text-gray-900 mb-2">Executive Summary</h2>
              <p className="text-gray-700 text-sm leading-relaxed">{result.executive_summary}</p>
            </div>
          </div>
        </div>

        {/* Should you sign? */}
        <div className={`border-2 rounded-2xl p-6 mb-6 ${result.should_sign ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${result.should_sign ? 'bg-green-100' : 'bg-red-100'}`}>
              {result.should_sign ? (
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <div>
              <h2 className={`text-lg font-bold mb-1 ${result.should_sign ? 'text-green-800' : 'text-red-800'}`}>
                {result.should_sign ? 'Generally Safe to Sign' : 'Do Not Sign Without Changes'}
              </h2>
              {result.lawyer_review_recommended && (
                <p className="text-sm mt-2 font-medium" style={{ color: result.should_sign ? '#065f46' : '#991b1b' }}>
                  ⚠️ Lawyer review recommended: {result.lawyer_review_reason}
                </p>
              )}
              {!result.lawyer_review_recommended && (
                <p className="text-sm" style={{ color: result.should_sign ? '#065f46' : '#991b1b' }}>
                  {result.lawyer_review_reason}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Key Findings */}
        {result.key_findings && result.key_findings.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Key Findings
              <span className="ml-2 text-sm font-normal text-gray-500">({result.key_findings.length} issues found)</span>
            </h2>
            <div className="space-y-3">
              {result.key_findings.map((finding, i) => (
                <FindingCard key={i} finding={finding} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* Negotiation Points */}
        {result.negotiation_points && result.negotiation_points.length > 0 && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
              </svg>
              Top Negotiation Points
            </h2>
            <ol className="space-y-3">
              {result.negotiation_points.map((point, i) => (
                <li key={i} className="flex gap-3 text-sm text-blue-800">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  {point}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Missing Protections */}
        {result.missing_protections && result.missing_protections.length > 0 && (
          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-bold text-orange-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Missing Protections
            </h2>
            <ul className="space-y-2">
              {result.missing_protections.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-orange-800">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Rating */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <StarRating reviewId={review.id} existingRating={review.rating} />
        </div>

        {/* Upsell */}
        <div style={{ backgroundColor: '#0f172a' }} className="rounded-2xl p-6 text-center text-white">
          <h3 className="text-lg font-bold mb-2">Need to review more contracts?</h3>
          <p className="text-gray-300 text-sm mb-4">Get unlimited reviews for $49/month. Cancel anytime.</p>
          <Link
            href="/review"
            className="inline-block text-white font-bold px-6 py-3 rounded-xl transition-colors"
            style={{ backgroundColor: '#10b981' }}
          >
            Subscribe — $49/mo Unlimited
          </Link>
          <p className="text-xs text-gray-500 mt-3">Or <Link href="/review" className="underline">review another contract</Link> for {` `}
            <span className="font-medium">pay-per-review pricing</span>
          </p>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-gray-400 text-center mt-6">
          This analysis is provided for informational purposes only and does not constitute legal advice. For high-stakes contracts, consult a licensed attorney.
        </p>
      </div>
    </Layout>
  )
}
