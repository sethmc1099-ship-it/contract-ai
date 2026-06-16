import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'
import Layout from '../components/Layout'

const TESTIMONIALS = [
  {
    name: 'Sarah M.',
    location: 'Austin, TX',
    stars: 5,
    text: 'My landlord tried to sneak in an auto-renewal clause that would have locked me in for 2 more years. ContractAI caught it in seconds. Saved me from a nightmare.',
  },
  {
    name: 'James T.',
    location: 'Chicago, IL',
    stars: 5,
    text: 'Signed a freelance contract without reviewing it and got burned. Never again. ContractAI flagged an IP assignment clause that would have given my client ownership of ALL my future work. Absolutely essential.',
  },
  {
    name: 'Priya K.',
    location: 'San Francisco, CA',
    stars: 5,
    text: 'As a small business owner, I can\'t afford a lawyer for every vendor agreement. ContractAI gives me professional-grade analysis at a fraction of the cost. Worth every penny.',
  },
]

const FAQS = [
  {
    q: 'What types of contracts can you review?',
    a: 'We review residential and commercial leases, service agreements, NDAs, employment contracts, freelance contracts, vendor agreements, and more. If it\'s a contract, we can analyze it.',
  },
  {
    q: 'How does the AI analysis work?',
    a: 'We use Claude, one of the most advanced AI models available, trained on vast legal knowledge. It reads every clause in your contract and identifies risks, missing protections, unusual terms, and negotiation opportunities — just like a human attorney would.',
  },
  {
    q: 'Is my contract kept private?',
    a: 'Your document is encrypted in transit and used solely to generate your analysis. We do not sell your data or use it to train AI models. Your review is accessible only via your unique private link.',
  },
  {
    q: 'How accurate is the analysis?',
    a: 'Our AI is highly accurate at identifying common contract risks, missing clauses, and unusual terms. However, like any tool, it is not infallible. We recommend using our analysis as a starting point, especially for high-stakes agreements where a licensed attorney should also review.',
  },
  {
    q: 'What if I\'m not satisfied with the results?',
    a: 'We stand behind our analysis. If you\'re not satisfied, contact us within 7 days of your purchase and we\'ll provide a full refund — no questions asked.',
  },
]

export async function getServerSideProps({ req, res }) {
  // Only run on server side
  const { getDb, logEvent } = require('../lib/db')
  const { getVariantForVisitor } = require('../lib/optimizer')

  let variantId = req.cookies?.['contract_ai_variant']
  let variantData = null

  try {
    const db = getDb()

    if (!variantId) {
      variantId = await getVariantForVisitor()
      // Set cookie for 30 days
      res.setHeader('Set-Cookie', `contract_ai_variant=${variantId}; Path=/; Max-Age=${30 * 24 * 3600}; SameSite=Lax`)
    }

    // Track visit and increment variant visit count
    db.prepare(`UPDATE ab_variants SET visits = visits + 1, updated_at = unixepoch() WHERE id = ?`).run(variantId)
    logEvent('visit', null, variantId, { path: '/' })

    const row = db.prepare('SELECT * FROM ab_variants WHERE id = ?').get(variantId)
    if (row) {
      variantData = { ...row, config: JSON.parse(row.config_json) }
    }
  } catch (err) {
    console.error('SSR error:', err)
  }

  // Fallback variant config
  if (!variantData) {
    variantData = {
      id: 'variant_a',
      config: {
        headline: 'Protect Yourself Before You Sign',
        subheadline: 'Upload your contract. Get a full legal risk analysis in 60 seconds. No lawyer needed.',
        price_cents: 1900,
        cta_text: 'Review My Contract — $19',
      },
    }
  }

  return {
    props: {
      variant: variantData,
    },
  }
}

export default function Home({ variant }) {
  const config = variant?.config || {}
  const priceDisplay = config.price_cents ? `$${(config.price_cents / 100).toFixed(0)}` : '$19'
  const [openFaq, setOpenFaq] = useState(null)

  return (
    <Layout>
      <Head>
        <title>ContractAI — AI-Powered Contract Review in 60 Seconds</title>
        <meta name="description" content="Upload your contract and get a full AI-powered legal risk analysis instantly. Identify hidden clauses, missing protections, and negotiation opportunities." />
      </Head>

      {/* Hero */}
      <section style={{ backgroundColor: '#0f172a' }} className="text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-900 text-emerald-300 text-sm px-4 py-1.5 rounded-full mb-6">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse inline-block"></span>
            AI-powered • Results in 60 seconds
          </div>
          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
            {config.headline || 'Protect Yourself Before You Sign'}
          </h1>
          <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            {config.subheadline || 'Upload your contract. Get a full legal risk analysis in 60 seconds. No lawyer needed.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/review"
              className="text-white font-bold text-lg px-8 py-4 rounded-xl transition-colors shadow-lg"
              style={{ backgroundColor: '#10b981' }}
            >
              {config.cta_text || 'Review My Contract'}
            </Link>
            <span className="text-gray-400 text-sm">No account needed</span>
          </div>
          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-gray-400">
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              PDF, DOCX, TXT supported
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              256-bit SSL encrypted
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              7-day money-back guarantee
            </div>
          </div>
        </div>
      </section>

      {/* Social proof bar */}
      <section className="bg-gray-50 border-y border-gray-200 py-4 px-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-10 text-center">
          <div className="flex items-center gap-2">
            <div className="flex">
              {[1,2,3,4,5].map(i => (
                <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="font-semibold text-gray-900">4.9/5 rating</span>
          </div>
          <div className="text-gray-600">Trusted by <span className="font-semibold text-gray-900">2,400+</span> renters, landlords & business owners</div>
          <div className="text-gray-600"><span className="font-semibold text-gray-900">$2.3M+</span> in contract risks identified</div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900">How It Works</h2>
            <p className="text-gray-600 mt-3 text-lg">Professional contract review in three simple steps</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Upload Your Contract',
                desc: 'Drag and drop your PDF, DOCX, or TXT file. We accept all standard contract formats up to 10MB.',
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                ),
              },
              {
                step: '02',
                title: 'AI Analyzes Every Clause',
                desc: 'Our AI reads the entire document and checks for risks, missing protections, unusual terms, and negotiation opportunities.',
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                ),
              },
              {
                step: '03',
                title: 'Get Your Risk Report',
                desc: 'Receive a detailed report with risk score, key findings, and specific negotiation recommendations — in plain English.',
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                ),
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 text-white" style={{ backgroundColor: '#10b981' }}>
                  {item.icon}
                </div>
                <div className="text-sm font-bold text-gray-400 mb-2">STEP {item.step}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Risk categories */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900">What We Find</h2>
            <p className="text-gray-600 mt-3 text-lg">Common risks hidden in contracts most people miss</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { title: 'Hidden Fees', desc: 'Maintenance charges, processing fees, and administrative costs buried in the fine print.', color: 'bg-red-50 border-red-100', icon: '💰' },
              { title: 'Auto-Renewal Traps', desc: 'Clauses that automatically extend your contract for months or years without clear notice.', color: 'bg-orange-50 border-orange-100', icon: '🔄' },
              { title: 'Unfair Liability', desc: 'One-sided indemnification clauses that make you responsible for things you didn\'t do.', color: 'bg-yellow-50 border-yellow-100', icon: '⚖️' },
              { title: 'Missing Protections', desc: 'Standard clauses that protect you which are conspicuously absent from this contract.', color: 'bg-blue-50 border-blue-100', icon: '🛡️' },
              { title: 'Non-Compete Risks', desc: 'Overly broad non-compete and non-solicitation clauses that could restrict your career.', color: 'bg-purple-50 border-purple-100', icon: '🚫' },
              { title: 'IP Assignment Issues', desc: 'Clauses that transfer ownership of your work, inventions, or intellectual property.', color: 'bg-pink-50 border-pink-100', icon: '📝' },
            ].map((item) => (
              <div key={item.title} className={`border rounded-xl p-5 ${item.color}`}>
                <div className="text-2xl mb-3">{item.icon}</div>
                <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900">Simple, Transparent Pricing</h2>
            <p className="text-gray-600 mt-3 text-lg">Way less than a lawyer. Way more than guessing.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Pay per review */}
            <div className="border-2 rounded-2xl p-8 relative" style={{ borderColor: '#10b981' }}>
              <div className="absolute -top-3 left-6">
                <span className="text-white text-xs font-bold px-3 py-1 rounded-full" style={{ backgroundColor: '#10b981' }}>
                  MOST POPULAR
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Pay Per Review</h3>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-5xl font-bold" style={{ color: '#10b981' }}>{priceDisplay}</span>
                <span className="text-gray-500">/ review</span>
              </div>
              <p className="text-gray-600 text-sm mb-6">One-time payment, no subscription</p>
              <ul className="space-y-3 mb-8">
                {[
                  'Full contract risk analysis',
                  'Risk score (0-100)',
                  'Key findings with explanations',
                  'Negotiation recommendations',
                  'Missing protections report',
                  'Should you sign? verdict',
                  'Permanent link to your report',
                ].map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm text-gray-700">
                    <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#10b981' }} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/review"
                className="block w-full text-center text-white font-bold py-3 px-6 rounded-xl transition-colors"
                style={{ backgroundColor: '#10b981' }}
              >
                {config.cta_text || 'Review My Contract'}
              </Link>
            </div>

            {/* Monthly */}
            <div className="border border-gray-200 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Monthly Unlimited</h3>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-5xl font-bold text-gray-900">$49</span>
                <span className="text-gray-500">/ month</span>
              </div>
              <p className="text-gray-600 text-sm mb-6">Cancel anytime</p>
              <ul className="space-y-3 mb-8">
                {[
                  'Everything in Pay Per Review',
                  'Unlimited contract reviews',
                  'Priority processing',
                  'Review history dashboard',
                  'Email delivery of results',
                  'Batch upload support',
                  'Priority support',
                ].map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm text-gray-700">
                    <svg className="w-4 h-4 flex-shrink-0 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/review"
                className="block w-full text-center text-gray-900 font-bold py-3 px-6 rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
          <p className="text-center text-sm text-gray-500 mt-6">
            Average law firm charges $200-$500/hour. ContractAI delivers professional-grade analysis in seconds.
          </p>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900">What Our Customers Say</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                <div className="flex mb-3">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-700 text-sm mb-4 leading-relaxed">"{t.text}"</p>
                <div>
                  <p className="font-semibold text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  className="w-full text-left p-5 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-semibold text-gray-900">{faq.q}</span>
                  <svg
                    className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-gray-600 text-sm leading-relaxed border-t border-gray-100 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ backgroundColor: '#0f172a' }} className="py-16 px-4 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Ready to protect yourself?</h2>
          <p className="text-gray-300 mb-8 text-lg">Upload your contract now and get a full risk analysis in under 60 seconds.</p>
          <Link
            href="/review"
            className="inline-block text-white font-bold text-lg px-10 py-4 rounded-xl transition-colors shadow-lg"
            style={{ backgroundColor: '#10b981' }}
          >
            {config.cta_text || 'Review My Contract'} &rarr;
          </Link>
          <p className="text-gray-500 text-sm mt-4">7-day money-back guarantee. No account needed.</p>
        </div>
      </section>
    </Layout>
  )
}
