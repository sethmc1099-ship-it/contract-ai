const { getDb, getAllVariants, logEvent } = require('./db')
const { generateVariantCopy } = require('./claude')
const { v4: uuidv4 } = require('uuid')

/**
 * Thompson Sampling: sample from Beta(conversions+1, failures+1)
 * Returns a sample from the posterior for each variant.
 */
function betaSample(alpha, beta) {
  // Approximate beta distribution using the Johnk method
  // For small values we use a simple approximation
  let x, y
  do {
    x = Math.pow(Math.random(), 1 / alpha)
    y = Math.pow(Math.random(), 1 / beta)
  } while (x + y > 1)
  return x / (x + y)
}

function thompsonSample(conversions, visits) {
  const alpha = conversions + 1
  const beta = Math.max(visits - conversions + 1, 1)
  return betaSample(alpha, beta)
}

/**
 * Get variant for a visitor using weighted random selection.
 * Winners get more traffic weight based on Thompson Sampling.
 */
async function getVariantForVisitor() {
  const db = getDb()
  const variants = getAllVariants().filter(v => v.active === 1)

  if (variants.length === 0) return 'variant_a'

  // If no data yet, pure random
  const totalVisits = variants.reduce((s, v) => s + v.visits, 0)
  if (totalVisits < 10) {
    return variants[Math.floor(Math.random() * variants.length)].id
  }

  // Thompson sampling: sample from each variant's posterior
  const samples = variants.map(v => ({
    id: v.id,
    sample: thompsonSample(v.conversions, v.visits),
  }))

  // Pick variant with highest sample
  samples.sort((a, b) => b.sample - a.sample)
  return samples[0].id
}

/**
 * Run the self-optimization engine.
 * Called after each successful payment (fire-and-forget).
 */
async function runOptimizer() {
  const db = getDb()
  const actions = []
  const recommendations = []

  try {
    const variants = getAllVariants().filter(v => v.active === 1)

    if (variants.length === 0) {
      return { actions_taken: [], current_winner: null, recommendations: ['No active variants'] }
    }

    // Calculate metrics for each variant
    const variantMetrics = variants.map(v => {
      const convRate = v.visits > 0 ? v.conversions / v.visits : 0
      const revenuePerVisitor = v.visits > 0 ? v.revenue / v.visits : 0
      const status = v.visits < 30 ? 'learning' : 'sufficient_data'
      return { ...v, convRate, revenuePerVisitor, status }
    })

    // Find current winner by revenue per visitor
    const withData = variantMetrics.filter(v => v.status === 'sufficient_data')
    let currentWinner = null

    if (withData.length > 0) {
      withData.sort((a, b) => b.revenuePerVisitor - a.revenuePerVisitor)
      currentWinner = withData[0].id

      // Check if winner is statistically clear using Thompson sampling
      const SAMPLES = 1000
      const winCounts = {}
      withData.forEach(v => { winCounts[v.id] = 0 })

      for (let i = 0; i < SAMPLES; i++) {
        let best = null, bestSample = -1
        withData.forEach(v => {
          const s = thompsonSample(v.conversions, v.visits)
          if (s > bestSample) { bestSample = s; best = v.id }
        })
        winCounts[best]++
      }

      const winnerProb = winCounts[currentWinner] / SAMPLES
      if (winnerProb > 0.95) {
        actions.push(`Clear winner: ${currentWinner} (${(winnerProb * 100).toFixed(1)}% probability of being best)`)
        logOptimization(db, 'winner_identified', `${currentWinner} is the clear winner with ${(winnerProb * 100).toFixed(1)}% confidence`, { variant_id: currentWinner, win_probability: winnerProb })
      }
    }

    // Check for underperforming variants
    for (const v of variantMetrics) {
      if (v.status === 'sufficient_data' && v.convRate < 0.02 && v.visits > 50) {
        // This variant is badly underperforming — disable it
        db.prepare(`UPDATE ab_variants SET active=0, updated_at=unixepoch() WHERE id=?`).run(v.id)
        actions.push(`Disabled underperforming variant ${v.id} (${(v.convRate * 100).toFixed(1)}% conv rate after ${v.visits} visits)`)
        logOptimization(db, 'variant_disabled', `Variant ${v.id} had <2% conversion after 50+ visits`, { variant_id: v.id, conv_rate: v.convRate })
      }
    }

    // Check if all variants are underperforming and we need new copy
    const allUnderperforming = withData.length > 0 && withData.every(v => v.convRate < 0.05)
    const activeCount = variants.filter(v => v.active).length
    const shouldGenerateNew = allUnderperforming || activeCount < 2

    if (shouldGenerateNew) {
      recommendations.push('All variants underperforming — generating new variant copy with Claude')
      try {
        const newCopy = await generateVariantCopy(variants)
        if (newCopy) {
          const newId = 'variant_' + uuidv4().substring(0, 8)
          db.prepare(`
            INSERT INTO ab_variants (id, name, config_json, active)
            VALUES (?, ?, ?, 1)
          `).run(newId, `Auto-Generated: ${newCopy.value_prop}`, JSON.stringify(newCopy))

          actions.push(`Generated new variant ${newId}: "${newCopy.headline}" at $${(newCopy.price_cents / 100).toFixed(2)}`)
          logOptimization(db, 'variant_created', 'Auto-generated new variant due to underperformance', { variant_id: newId, config: newCopy })
        }
      } catch (err) {
        console.error('Failed to generate new variant:', err)
      }
    }

    // Price adjustment recommendation
    if (withData.length >= 2) {
      const sorted = [...withData].sort((a, b) => b.revenuePerVisitor - a.revenuePerVisitor)
      const winner = sorted[0]
      const winnerConfig = winner.config
      const avgConvRate = withData.reduce((s, v) => s + v.convRate, 0) / withData.length

      if (avgConvRate > 0.15 && winnerConfig.price_cents < 3900) {
        recommendations.push(`High conversion rate (${(avgConvRate * 100).toFixed(1)}%) — consider testing a higher price point`)
      } else if (avgConvRate < 0.03 && winnerConfig.price_cents > 1500) {
        recommendations.push(`Low conversion rate (${(avgConvRate * 100).toFixed(1)}%) — consider testing a lower price point`)
      }
    }

    return {
      actions_taken: actions,
      current_winner: currentWinner,
      recommendations,
      variant_metrics: variantMetrics.map(v => ({
        id: v.id,
        name: v.name,
        visits: v.visits,
        conversions: v.conversions,
        conv_rate: (v.convRate * 100).toFixed(2) + '%',
        revenue_per_visitor: '$' + (v.revenuePerVisitor / 100).toFixed(4),
        status: v.status,
      })),
    }
  } catch (err) {
    console.error('Optimizer error:', err)
    return { actions_taken: [], current_winner: null, recommendations: [], error: err.message }
  }
}

function logOptimization(db, action, reason, data) {
  try {
    db.prepare(`INSERT INTO optimization_log (action, reason, data) VALUES (?, ?, ?)`).run(
      action,
      reason,
      JSON.stringify(data)
    )
  } catch (err) {
    console.error('Failed to log optimization:', err)
  }
}

module.exports = { runOptimizer, getVariantForVisitor }
