import Head from 'next/head'
import { useRouter } from 'next/router'
import { useState } from 'react'
import Layout from '../components/Layout'
import UploadZone from '../components/UploadZone'

const STEPS = [
  { num: 1, label: 'Upload' },
  { num: 2, label: 'Payment' },
  { num: 3, label: 'Results' },
]

export async function getServerSideProps({ req }) {
  const variantId = req.cookies?.['contract_ai_variant'] || 'variant_a'
  return { props: { variantId } }
}

export default function Review({ variantId }) {
  const router = useRouter()
  const [uploadResult, setUploadResult] = useState(null)
  const [redirecting, setRedirecting] = useState(false)

  const handleUpload = (data) => {
    setUploadResult(data)
  }

  const handleProceedToPayment = async () => {
    if (!uploadResult?.review_id) return
    setRedirecting(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_id: uploadResult.review_id }),
      })
      const data = await res.json()
      if (data.checkout_url) {
        window.location.href = data.checkout_url
      } else {
        throw new Error(data.error || 'Failed to create checkout session')
      }
    } catch (err) {
      alert('Error: ' + err.message)
      setRedirecting(false)
    }
  }

  return (
    <Layout>
      <Head>
        <title>Upload Your Contract — ContractAI</title>
        <meta name="description" content="Upload your contract for AI-powered legal risk analysis." />
      </Head>

      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-10">
          {STEPS.map((step, idx) => (
            <div key={step.num} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                  step.num === 1
                    ? 'text-white'
                    : 'bg-gray-100 text-gray-400'
                }`} style={step.num === 1 ? { backgroundColor: '#10b981' } : {}}>
                  {step.num}
                </div>
                <span className={`text-xs mt-1 font-medium ${step.num === 1 ? 'text-gray-900' : 'text-gray-400'}`}>
                  {step.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className="w-16 h-0.5 bg-gray-200 mx-2 mb-4" />
              )}
            </div>
          ))}
        </div>

        {!uploadResult ? (
          <>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Upload Your Contract</h1>
              <p className="text-gray-600">We'll analyze every clause and flag what you need to know before signing.</p>
            </div>

            <UploadZone onUpload={handleUpload} variant={variantId} />

            {/* What happens next */}
            <div className="mt-8 bg-gray-50 border border-gray-200 rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                What happens next
              </h3>
              <ol className="space-y-2 text-sm text-gray-600">
                <li className="flex gap-2"><span className="font-semibold text-gray-800 w-4">1.</span> Your file is uploaded securely over HTTPS</li>
                <li className="flex gap-2"><span className="font-semibold text-gray-800 w-4">2.</span> You'll review your order and complete payment</li>
                <li className="flex gap-2"><span className="font-semibold text-gray-800 w-4">3.</span> Our AI immediately analyzes your contract (usually under 60 seconds)</li>
                <li className="flex gap-2"><span className="font-semibold text-gray-800 w-4">4.</span> You receive a full risk report with specific recommendations</li>
              </ol>
            </div>

            {/* Security badges */}
            <div className="mt-5 flex items-center justify-center gap-6 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                256-bit SSL
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Private & Secure
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                7-day refund
              </span>
            </div>
          </>
        ) : (
          /* Post-upload: show summary and CTA */
          <div>
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#d1fae5' }}>
                <svg className="w-8 h-8" style={{ color: '#10b981' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Successful!</h2>
              <p className="text-gray-600">Your contract is ready to be analyzed.</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">Document Summary</h3>
              <dl className="space-y-3">
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-500">File name</dt>
                  <dd className="font-medium text-gray-900 max-w-xs truncate">{uploadResult.document_name}</dd>
                </div>
                {uploadResult.num_pages > 0 && (
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">Pages detected</dt>
                    <dd className="font-medium text-gray-900">{uploadResult.num_pages}</dd>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-500">Status</dt>
                  <dd className="flex items-center gap-1 font-medium" style={{ color: '#10b981' }}>
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#10b981' }}></span>
                    Ready for analysis
                  </dd>
                </div>
              </dl>
            </div>

            <button
              onClick={handleProceedToPayment}
              disabled={redirecting}
              className="w-full text-white font-bold py-4 rounded-xl text-lg transition-colors disabled:opacity-60"
              style={{ backgroundColor: '#10b981' }}
            >
              {redirecting ? 'Redirecting to payment...' : 'Proceed to Payment →'}
            </button>

            <button
              onClick={() => setUploadResult(null)}
              className="w-full mt-3 text-gray-500 text-sm hover:text-gray-700 transition-colors py-2"
            >
              Upload a different file
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}
