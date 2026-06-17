import { getDb, logEvent, isUnlimitedBuyer } from '../../lib/db'
import { analyzeContract } from '../../lib/claude'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { review_id, email } = req.body || {}
  if (!review_id || !email) return res.status(400).json({ error: 'review_id and email required' })

  const unlimited = await isUnlimitedBuyer(email)
  if (!unlimited) return res.status(403).json({ error: 'No unlimited access for this email' })

  try {
    const db = await getDb()
    const reviewResult = await db.execute({ sql: 'SELECT * FROM reviews WHERE id = ?', args: [review_id] })
    const review = reviewResult.rows[0]
    if (!review) return res.status(404).json({ error: 'Review not found' })

    // Already done
    if (review.paid && review.status === 'complete') {
      return res.status(200).json({ ok: true, already_done: true })
    }

    // Mark as paid via unlimited access
    await db.execute({
      sql: `UPDATE reviews SET paid = 1, status = 'paid', email = ?, payment_intent = 'unlimited', price_paid = 0 WHERE id = ?`,
      args: [email, review_id],
    })

    await logEvent('payment_success', review_id, review.variant, { method: 'unlimited', email })

    // Run analysis
    const analysisResult = await analyzeContract(review.document_text, review.document_name)
    await db.execute({
      sql: `UPDATE reviews SET status = 'complete', result_json = ? WHERE id = ?`,
      args: [JSON.stringify(analysisResult.data), review_id],
    })

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('Redeem unlimited error:', err)
    return res.status(500).json({ error: err.message })
  }
}
