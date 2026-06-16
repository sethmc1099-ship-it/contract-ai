import { getDb, logEvent } from '../../lib/db'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  let body
  try {
    body = await new Promise((resolve, reject) => {
      let data = ''
      req.on('data', chunk => { data += chunk })
      req.on('end', () => {
        try { resolve(JSON.parse(data)) } catch (e) { reject(e) }
      })
      req.on('error', reject)
    })
  } catch (err) {
    return res.status(400).json({ error: 'Invalid JSON' })
  }

  const { review_id, rating } = body || {}

  if (!review_id || !rating) {
    return res.status(400).json({ error: 'review_id and rating are required' })
  }

  const numRating = parseInt(rating, 10)
  if (numRating < 1 || numRating > 5 || isNaN(numRating)) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' })
  }

  try {
    const db = await getDb()
    const reviewResult = await db.execute({ sql: 'SELECT id, variant FROM reviews WHERE id = ?', args: [review_id] })
    const review = reviewResult.rows[0]

    if (!review) {
      return res.status(404).json({ error: 'Review not found' })
    }

    await db.execute({ sql: 'UPDATE reviews SET rating = ? WHERE id = ?', args: [numRating, review_id] })
    await logEvent('rating', review_id, review.variant, { rating: numRating })

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('Rate error:', err)
    return res.status(500).json({ error: err.message })
  }
}
