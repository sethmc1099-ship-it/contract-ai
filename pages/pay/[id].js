import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'
import Layout from '../../components/Layout'

export async function getServerSideProps({ params }) {
  const { id } = params

  try {
    const { getDb, getVariant } = require('../../lib/db')
    const db = await getDb()

    const reviewResult = await db.execute({ sql: `SELECT id, document_name, status, paid, variant FROM reviews WHERE id = ?`, args: [id] })
    const review = reviewResult.rows[0]

    if (!review) {
      return { notFound: true }
    }

    if (review.paid === 1) {
      return {
        redirect: { destination: `/results/${id}`, permanent: false },
      }
    }

    const variant = await getVariant(review.variant)
    const config = variant?.config || { price_cents: 1900, cta_text: 'Pay & Get Review' }

    return {
      props: {
        review: { id: review.id, document_name: review.document_name, status: review.status },
        config,
      },
    }
  } catch (err) {
    console.error('Pay page SSR error:', err)
    return { notFound: true }
  }
}

export default function PayPage({ review, config }) {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  const priceDisplay = config.price_cents ? `$${(config.price_cents / 100).toFixed(2)}` : '$19.00'

  const handleCheckout = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_id: review.id, email }),
      })
      const data = await res.json()
      if (data.checkout_url) {
        window.location.href = data.checkout_url
      } else {
        throw new Error(data.error || 'Could not create checkout session')
      }
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <Layout>
      <Head>
        <title>Complete Payment — ContractAI</title>
      </Head>

      <div className="max-w-lg mx-auto px-4 py-12">
        {/* Progress */}
        <div className="flex items-center justify-center mb-10">
          {[
            { num: 1, label: 'Upload', done: true },
            { num: 2, label: 'Payment', active: true },
            { num: 3, label: 'Results' },
          ].map((step, idx) => (
            <div key={step.num} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                  step.done
                    ? 'bg-green-100 text-green-600'
                    : step.active
                    ? 'text-white'
                    : 'bg-gray-100 text-gray-400'
                }`} style={step.active ? { backgroundColor: '#10b981' } : {}}>
                  {step.done ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : step.num}
                </div>
                <span className={`text-xs mt-1 font-medium ${step.active ? 'text-gray-900' : step.done ? 'text-green-600' : 'text-gray-400'}`}>
                  {step.label}
                </span>
              </div>
              {idx < 2 && <div className="w-16 h-0.5 bg-gray-200 mx-2 mb-4" />}
            </div>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          {/* Order summary */}
          <div className="p-6 border-b border-gray-100">
            <h2 className="font-bold text-gray-900 text-lg mb-4">Order Summary</h2>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6" style={{ color: '#10b981' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 truncate">{review.document_name}</p>
                <p className="text-sm text-gray-500">Full AI Contract Analysis</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900">{priceDisplay}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm">
              <span className="text-gray-500">Total</span>
              <span className="font-bold text-gray-900 text-base">{priceDisplay}</span>
            </div>
          </div>

          {/* What you get */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">What you get</p>
            <ul className="space-y-2">
              {[
                'Full risk analysis with 0-100 risk score',
                'Every clause flagged and explained in plain English',
                'Specific negotiation recommendations',
                'Missing protections checklist',
                'Clear verdict: should you sign?',
              ].map(item => (
                <li key={item} className="flex items-center gap-2 text-sm text-gray-700">
                  <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#10b981' }} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Payment form */}
          <div className="p-6">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email address <span className="text-gray-400 font-normal">(optional — receive results by email)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': '#10b981' }}
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full text-white font-bold py-4 rounded-xl text-lg transition-colors disabled:opacity-60"
              style={{ backgroundColor: '#10b981' }}
            >
              {loading ? 'Loading...' : `Pay ${priceDisplay} — Get My Review`}
            </button>

            <p className="text-center text-xs text-gray-400 mt-3">
              Powered by Stripe. Secure 256-bit SSL encryption.
            </p>

            {/* Security badges */}
            <div className="flex justify-center gap-4 mt-4 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                SSL Secure
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                7-day guarantee
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                No data stored
              </span>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Have questions?{' '}
          <Link href="/#faq" className="underline hover:text-gray-600">See our FAQ</Link>
        </p>
      </div>
    </Layout>
  )
}
