// TEST ENDPOINT — simulates Stripe webhook for end-to-end testing
import { getDb, logEvent } from '../../lib/db'
import { analyzeContract } from '../../lib/claude'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  if (req.body?.secret !== process.env.ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized' })

  const { review_id } = req.body
  if (!review_id) return res.status(400).json({ error: 'review_id required' })

  const t0 = Date.now()
  try {
    const db = await getDb()
    const reviewResult = await db.execute({ sql: 'SELECT * FROM reviews WHERE id = ?', args: [review_id] })
    const review = reviewResult.rows[0]
    if (!review) return res.status(404).json({ error: 'Review not found' })

    console.log(`[simulate-payment] Got review: ${review.document_name}`)

    // Mark as paid (simulating Stripe webhook)
    await db.execute({
      sql: `UPDATE reviews SET paid = 1, status = 'paid', payment_intent = ?, price_paid = 1900 WHERE id = ?`,
      args: [`pi_simulated_${Date.now()}`, review_id],
    })
    await db.execute({
      sql: `UPDATE ab_variants SET conversions = conversions + 1, revenue = revenue + 1900, updated_at = unixepoch() WHERE id = ?`,
      args: [review.variant],
    })
    await logEvent('payment_success', review_id, review.variant, { amount: 1900, simulated: true })

    console.log(`[simulate-payment] Running Claude analysis at ${Date.now() - t0}ms`)

    // Run Claude analysis
    const analysisResult = await analyzeContract(review.document_text, review.document_name)
    console.log(`[simulate-payment] Claude done at ${Date.now() - t0}ms, success=${analysisResult.success}`)

    await db.execute({
      sql: `UPDATE reviews SET status = 'complete', result_json = ? WHERE id = ?`,
      args: [JSON.stringify(analysisResult.data), review_id],
    })

    return res.status(200).json({
      ok: true,
      duration_ms: Date.now() - t0,
      analysis: analysisResult,
    })
  } catch (err) {
    console.error('[simulate-payment] Error:', err)
    return res.status(500).json({ error: err.message, duration_ms: Date.now() - t0 })
  }
}
