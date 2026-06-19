import Stripe from 'stripe'
import { getDb, getVariant, logEvent, isUnlimitedBuyer } from '../../lib/db'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { review_id, email, type } = req.body || {}
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

  // Unlimited one-time purchase — no review_id needed
  if (type === 'unlimited') {
    if (!email) return res.status(400).json({ error: 'email is required for unlimited purchase' })
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        customer_email: email,
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'ContractAI — Unlimited Reviews',
              description: 'Unlimited contract reviews for life. One-time payment, never pay again.',
            },
            unit_amount: 14900,
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${baseUrl}/unlimited-success?email=${encodeURIComponent(email)}`,
        cancel_url: `${baseUrl}/#pricing`,
        metadata: { type: 'unlimited', email },
      })
      return res.status(200).json({ checkout_url: session.url })
    } catch (err) {
      console.error('Unlimited checkout error:', err)
      return res.status(500).json({ error: err.message })
    }
  }

  // Single review checkout
  if (!review_id) return res.status(400).json({ error: 'review_id is required' })

  try {
    const db = await getDb()

    // Check if email has unlimited access — skip payment
    if (email && await isUnlimitedBuyer(email)) {
      return res.status(200).json({ unlimited: true, message: 'Unlimited access confirmed' })
    }

    const reviewResult = await db.execute({ sql: 'SELECT * FROM reviews WHERE id = ?', args: [review_id] })
    const review = reviewResult.rows[0]
    if (!review) return res.status(404).json({ error: 'Review not found' })
    if (review.paid) return res.status(400).json({ error: 'Already paid', redirect: `/results/${review_id}` })

    const variant = await getVariant(review.variant)
    const priceCents = 900

    if (email) {
      await db.execute({ sql: 'UPDATE reviews SET email = ? WHERE id = ?', args: [email, review_id] })
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'ContractAI — Single Review',
            description: `Full AI-powered analysis of: ${review.document_name}`,
          },
          unit_amount: priceCents,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${baseUrl}/results/${review_id}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pay/${review_id}`,
      metadata: { review_id, variant: review.variant, type: 'single' },
      ...(email ? { customer_email: email } : {}),
    })

    await logEvent('checkout_start', review_id, review.variant, { session_id: session.id, price_cents: priceCents })
    return res.status(200).json({ checkout_url: session.url })
  } catch (err) {
    console.error('Checkout error:', err)
    return res.status(500).json({ error: err.message })
  }
}
