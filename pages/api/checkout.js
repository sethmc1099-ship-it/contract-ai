import Stripe from 'stripe'
import { getDb, getVariant, logEvent } from '../../lib/db'

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
    return res.status(400).json({ error: 'Invalid JSON body' })
  }

  const { review_id, email } = body

  if (!review_id) {
    return res.status(400).json({ error: 'review_id is required' })
  }

  try {
    const db = getDb()
    const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(review_id)

    if (!review) {
      return res.status(404).json({ error: 'Review not found' })
    }

    if (review.paid) {
      return res.status(400).json({ error: 'Already paid', redirect: `/results/${review_id}` })
    }

    const variant = getVariant(review.variant)
    const priceCents = variant?.config?.price_cents || 1900

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

    // Update email if provided
    if (email) {
      db.prepare('UPDATE reviews SET email = ? WHERE id = ?').run(email, review_id)
    }

    const sessionParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Contract AI Review',
              description: `Full AI-powered analysis of: ${review.document_name}`,
              images: [],
            },
            unit_amount: priceCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/results/${review_id}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pay/${review_id}`,
      metadata: {
        review_id,
        variant: review.variant,
      },
    }

    if (email) {
      sessionParams.customer_email = email
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    logEvent('checkout_start', review_id, review.variant, { session_id: session.id, price_cents: priceCents })

    return res.status(200).json({ checkout_url: session.url })
  } catch (err) {
    console.error('Checkout error:', err)
    return res.status(500).json({ error: err.message })
  }
}
