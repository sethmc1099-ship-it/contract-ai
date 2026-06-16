import Stripe from 'stripe'
import { getDb, logEvent } from '../../lib/db'
import { analyzeContract } from '../../lib/claude'
import { sendResultsEmail } from '../../lib/email'

export const config = {
  api: { bodyParser: false },
}

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let rawBody
  try {
    rawBody = await getRawBody(req)
  } catch (err) {
    return res.status(400).json({ error: 'Failed to read body' })
  }

  let event
  try {
    if (webhookSecret) {
      const sig = req.headers['stripe-signature']
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
    } else {
      // Dev mode: parse without signature verification
      event = JSON.parse(rawBody.toString())
    }
  } catch (err) {
    console.error('Webhook signature error:', err.message)
    return res.status(400).json({ error: `Webhook error: ${err.message}` })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const { review_id, variant } = session.metadata || {}

    if (!review_id) {
      console.error('No review_id in webhook metadata')
      return res.status(200).json({ received: true })
    }

    try {
      const db = getDb()
      const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(review_id)

      if (!review) {
        console.error('Review not found:', review_id)
        return res.status(200).json({ received: true })
      }

      // Mark as paid
      db.prepare(`
        UPDATE reviews
        SET paid = 1, status = 'paid', payment_intent = ?, price_paid = ?
        WHERE id = ?
      `).run(
        session.payment_intent,
        session.amount_total,
        review_id
      )

      // Update variant conversion stats
      db.prepare(`
        UPDATE ab_variants
        SET conversions = conversions + 1, revenue = revenue + ?, updated_at = unixepoch()
        WHERE id = ?
      `).run(session.amount_total, variant || review.variant)

      logEvent('payment_success', review_id, variant || review.variant, {
        amount: session.amount_total,
        payment_intent: session.payment_intent,
      })

      // Run analysis
      const analysisResult = await analyzeContract(review.document_text, review.document_name)

      db.prepare(`
        UPDATE reviews
        SET status = 'complete', result_json = ?
        WHERE id = ?
      `).run(JSON.stringify(analysisResult.data), review_id)

      // Send email if provided
      const updatedReview = db.prepare('SELECT * FROM reviews WHERE id = ?').get(review_id)
      if (updatedReview?.email) {
        sendResultsEmail(updatedReview.email, review_id, review.document_name).catch(console.error)
      }

      // Fire-and-forget optimizer run
      const { runOptimizer } = require('../../lib/optimizer')
      runOptimizer().catch(console.error)

    } catch (err) {
      console.error('Webhook processing error:', err)
      // Still return 200 to Stripe so it doesn't retry
    }
  }

  return res.status(200).json({ received: true })
}
