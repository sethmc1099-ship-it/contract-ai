import Head from 'next/head'
import { useState } from 'react'
import Link from 'next/link'

export async function getServerSideProps({ query }) {
  const secret = query.secret || ''

  if (secret !== process.env.ADMIN_SECRET) {
    return {
      props: { authorized: false, stats: null },
    }
  }

  try {
    const { getStats } = require('../lib/db')
    const stats = await getStats()

    // Serialize dates (SQLite returns integers)
    return {
      props: {
        authorized: true,
        stats: JSON.parse(JSON.stringify(stats)),
        secret,
      },
    }
  } catch (err) {
    return {
      props: { authorized: true, stats: null, error: err.message, secret },
    }
  }
}

function MetricCard({ label, value, sub }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}

function pct(a, b) {
  if (!b || b === 0) return '0%'
  return ((a / b) * 100).toFixed(1) + '%'
}

function fmtCents(cents) {
  return '$' + ((cents || 0) / 100).toFixed(2)
}

function fmtDate(ts) {
  if (!ts) return '-'
  return new Date(ts * 1000).toLocaleDateString()
}

export default function AdminPage({ authorized, stats, error, secret }) {
  const [optimizing, setOptimizing] = useState(false)
  const [optimizeResult, setOptimizeResult] = useState(null)

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">Add ?secret=YOUR_ADMIN_SECRET to the URL</p>
        </div>
      </div>
    )
  }

  const handleOptimize = async () => {
    setOptimizing(true)
    try {
      const res = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret }),
      })
      const data = await res.json()
      setOptimizeResult(data)
    } catch (err) {
      setOptimizeResult({ error: err.message })
    }
    setOptimizing(false)
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen p-8 bg-gray-50">
        <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
        <p className="text-red-600">{error || 'Failed to load stats'}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head><title>Admin — ContractAI</title></Head>

      <div style={{ backgroundColor: '#0f172a' }} className="px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-white font-bold text-lg">ContractAI</span>
            <span className="text-gray-400 text-sm ml-2">Admin Dashboard</span>
          </div>
          <Link href="/" className="text-gray-400 hover:text-white text-sm transition-colors">← Back to site</Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Revenue */}
        <h2 className="text-lg font-bold text-gray-900 mb-4">Revenue</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <MetricCard label="Today" value={fmtCents(stats.revenue.today)} />
          <MetricCard label="This Week" value={fmtCents(stats.revenue.week)} />
          <MetricCard label="This Month" value={fmtCents(stats.revenue.month)} />
          <MetricCard label="All Time" value={fmtCents(stats.revenue.all_time)} />
        </div>

        {/* Funnel */}
        <h2 className="text-lg font-bold text-gray-900 mb-4">Conversion Funnel</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <MetricCard label="Visits" value={stats.funnel.visits.toLocaleString()} />
          <MetricCard label="Uploads" value={stats.funnel.uploads.toLocaleString()} sub={pct(stats.funnel.uploads, stats.funnel.visits) + ' of visits'} />
          <MetricCard label="Checkouts Started" value={stats.funnel.checkouts.toLocaleString()} sub={pct(stats.funnel.checkouts, stats.funnel.uploads) + ' of uploads'} />
          <MetricCard label="Payments" value={stats.funnel.payments.toLocaleString()} sub={pct(stats.funnel.payments, stats.funnel.checkouts) + ' of checkouts'} />
        </div>

        {/* A/B Variants */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">A/B Variant Performance</h2>
          <button
            onClick={handleOptimize}
            disabled={optimizing}
            className="text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
            style={{ backgroundColor: '#10b981' }}
          >
            {optimizing ? 'Running...' : '⚡ Run Optimizer Now'}
          </button>
        </div>

        {optimizeResult && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm">
            <p className="font-semibold text-blue-900 mb-2">Optimizer Result:</p>
            {optimizeResult.error ? (
              <p className="text-red-600">{optimizeResult.error}</p>
            ) : (
              <>
                <p>Winner: <span className="font-semibold">{optimizeResult.current_winner || 'N/A'}</span></p>
                {optimizeResult.actions_taken?.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {optimizeResult.actions_taken.map((a, i) => <li key={i} className="text-blue-800">• {a}</li>)}
                  </ul>
                )}
                {optimizeResult.recommendations?.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {optimizeResult.recommendations.map((r, i) => <li key={i} className="text-blue-600">→ {r}</li>)}
                  </ul>
                )}
              </>
            )}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Variant</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Headline</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Price</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Visits</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Conv.</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Conv. Rate</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Revenue</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rev/Visitor</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stats.variants.map(v => {
                const convRate = v.visits > 0 ? (v.conversions / v.visits * 100).toFixed(1) : '0.0'
                const revPerVisitor = v.visits > 0 ? (v.revenue / v.visits / 100).toFixed(3) : '0.000'
                return (
                  <tr key={v.id} className={`hover:bg-gray-50 ${!v.active ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{v.id}</td>
                    <td className="px-4 py-3 text-gray-900 max-w-xs truncate">{v.config?.headline}</td>
                    <td className="px-4 py-3 text-right font-semibold">{fmtCents(v.config?.price_cents)}</td>
                    <td className="px-4 py-3 text-right">{v.visits}</td>
                    <td className="px-4 py-3 text-right">{v.conversions}</td>
                    <td className="px-4 py-3 text-right font-semibold">{convRate}%</td>
                    <td className="px-4 py-3 text-right">{fmtCents(v.revenue)}</td>
                    <td className="px-4 py-3 text-right">${revPerVisitor}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${v.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                        {v.active ? 'Active' : 'Paused'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Optimization Log */}
        {stats.optimization_log?.length > 0 && (
          <>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Optimization Log</h2>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-8">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stats.optimization_log.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmtDate(log.created_at)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-blue-700">{log.action}</td>
                      <td className="px-4 py-3 text-gray-700 text-xs">{log.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Recent Reviews */}
        <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Reviews</h2>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Document</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Paid</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Variant</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Rating</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stats.recent_reviews.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmtDate(r.created_at)}</td>
                  <td className="px-4 py-3 text-gray-900 max-w-xs truncate">{r.document_name || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      r.status === 'complete' ? 'bg-green-100 text-green-800' :
                      r.status === 'paid' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-600'
                    }`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3 text-center">{r.paid ? '✓' : '–'}</td>
                  <td className="px-4 py-3 text-right">{r.price_paid ? fmtCents(r.price_paid) : '-'}</td>
                  <td className="px-4 py-3 text-center font-mono text-xs text-gray-500">{r.variant}</td>
                  <td className="px-4 py-3 text-center">{r.rating ? '⭐'.repeat(r.rating) : '-'}</td>
                  <td className="px-4 py-3 text-right">
                    {r.paid ? (
                      <Link href={`/results/${r.id}`} className="text-blue-600 hover:underline text-xs">View</Link>
                    ) : '-'}
                  </td>
                </tr>
              ))}
              {stats.recent_reviews.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-400">No reviews yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
