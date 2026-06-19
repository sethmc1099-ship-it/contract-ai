import Head from 'next/head'
import { useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'

export async function getServerSideProps({ params }) {
  const { id } = params
  try {
    const { getDb } = require('../../lib/db')
    const db = await getDb()
    const reviewResult = await db.execute({ sql: `SELECT id, document_name, status, paid, variant FROM reviews WHERE id = ?`, args: [id] })
    const review = reviewResult.rows[0]
    if (!review) return { notFound: true }
    if (review.paid === 1) return { redirect: { destination: `/results/${id}`, permanent: false } }
    return { props: { review: { id: review.id, document_name: review.document_name } } }
  } catch (err) {
    return { notFound: true }
  }
}

export default function PayPage({ review }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [unlimitedLoading, setUnlimitedLoading] = useState(false)
  const [isUnlimited, setIsUnlimited] = useState(false)
  const [checkedEmail, setCheckedEmail] = useState('')
  const [error, setError] = useState('')

  const checkUnlimited = async (e) => {
    const val = e.target.value
    setEmail(val)
    if (val.includes('@') && val.includes('.') && val !== checkedEmail) {
      setCheckedEmail(val)
      try {
        const res = await fetch('/api/check-unlimited', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: val }),
        })
        const data = await res.json()
        setIsUnlimited(data.unlimited || false)
      } catch (_) {}
    }
  }

  const handleSingleCheckout = async () => {
    setLoading(true)
    setError('')
    try {
      if (isUnlimited) {
        const res = await fetch('/api/redeem-unlimited', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ review_id: review.id, email }),
        })
        if (res.ok) { router.push(`/results/${review.id}`); return }
      }
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_id: review.id, email, type: 'single' }),
      })
      const data = await res.json()
      if (data.checkout_url) window.location.href = data.checkout_url
      else throw new Error(data.error || 'Could not create checkout')
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  const handleUnlimitedCheckout = async () => {
    if (!email) { setError('Enter your email first to purchase unlimited access'); return }
    setUnlimitedLoading(true)
    setError('')
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 'unlimited' }),
      })
      const data = await res.json()
      if (data.checkout_url) window.location.href = data.checkout_url
      else throw new Error(data.error || 'Could not create checkout')
    } catch (err) {
      setError(err.message)
      setUnlimitedLoading(false)
    }
  }

  const CheckIcon = () => (
    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  )

  return (
    <Layout>
      <Head><title>Complete Payment — ContractAI</title></Head>
      <div className="max-w-2xl mx-auto px-4 py-12">

        {/* Progress */}
        <div className="flex items-center justify-center mb-10">
          {[{ num: 1, label: 'Upload', done: true }, { num: 2, label: 'Payment', active: true }, { num: 3, label: 'Results' }].map((step, idx) => (
            <div key={step.num} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${step.done ? 'bg-green-100 text-green-600' : step.active ? 'text-white' : 'bg-gray-100 text-gray-400'}`}
                  style={step.active ? { backgroundColor: '#10b981' } : {}}
                >
                  {step.done
                    ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    : step.num}
                </div>
                <span className={`text-xs mt-1 font-medium ${step.active ? 'text-gray-900' : step.done ? 'text-green-600' : 'text-gray-400'}`}>{step.label}</span>
              </div>
              {idx < 2 && <div className="w-16 h-0.5 bg-gray-200 mx-2 mb-4" />}
            </div>
          ))}
        </div>

        {/* File name */}
        <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-6">
          <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-sm text-gray-700 font-medium truncate">{review.document_name}</span>
        </div>

        {/* Email */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email address <span className="text-gray-400 font-normal">(get results by email + unlock unlimited access)</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={checkUnlimited}
            placeholder="you@example.com"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          {isUnlimited && (
            <div className="mt-2 flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Unlimited access detected — this review is free!
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
        )}

        {/* Two pricing options */}
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          {/* Single review */}
          <div className="border-2 rounded-2xl p-6 flex flex-col" style={{ borderColor: '#10b981' }}>
            <div className="text-xs font-bold text-emerald-600 mb-3">SINGLE REVIEW</div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-4xl font-bold text-gray-900">$9</span>
            </div>
            <div className="text-sm text-gray-500 mb-5">one-time payment</div>
            <ul className="space-y-2 mb-6 flex-1">
              {['Full AI risk analysis', 'Risk score & key findings', 'Negotiation recommendations', 'Clear sign / do not sign verdict'].map(item => (
                <li key={item} className="flex items-center gap-2 text-sm text-gray-700">
                  <span style={{ color: '#10b981' }}><CheckIcon /></span>
                  {item}
                </li>
              ))}
            </ul>
            <button
              onClick={handleSingleCheckout}
              disabled={loading}
              className="w-full text-white font-bold py-3 rounded-xl transition-opacity disabled:opacity-60"
              style={{ backgroundColor: '#10b981' }}
            >
              {loading ? 'Loading...' : isUnlimited ? 'Use Unlimited Access' : 'Pay $9 — Get My Review'}
            </button>
          </div>

          {/* Unlimited */}
          <div className="border border-gray-200 rounded-2xl p-6 flex flex-col">
            <div className="text-xs font-bold text-gray-500 mb-3">UNLIMITED FOREVER</div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-4xl font-bold text-gray-900">$149</span>
            </div>
            <div className="text-sm text-gray-500 mb-5">one-time, never pay again</div>
            <ul className="space-y-2 mb-6 flex-1">
              {['Everything in single review', 'Unlimited reviews for life', 'Any contract, anytime', 'Best value for power users'].map(item => (
                <li key={item} className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="text-gray-400"><CheckIcon /></span>
                  {item}
                </li>
              ))}
            </ul>
            <button
              onClick={handleUnlimitedCheckout}
              disabled={unlimitedLoading}
              className="w-full text-gray-900 font-bold py-3 rounded-xl border-2 border-gray-200 hover:border-gray-400 transition-colors disabled:opacity-60 bg-white"
            >
              {unlimitedLoading ? 'Loading...' : 'Get Unlimited — $149'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400">
          Powered by Stripe · 256-bit SSL encryption · 7-day money-back guarantee
        </p>
      </div>
    </Layout>
  )
}
