import Stripe from 'stripe'
import { getDb, getVariant, logEvent } from '../../lib/db'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const t0 = Date.now()
  console.log('[checkout] START')

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
  if (!review_id) return res.status(400).json({ error: 'review_id is required' })

  try {
    console.log('[checkout] Connecting to DB...')
    const db = await getDb()
    console.log(`[checkout] DB ready in ${Date.now() - t0}ms`)

    const reviewResult = await db.execute({ sql: 'SELECT * FROM reviews WHERE id = ?', args: [review_id] })
    console.log(`[checkout] Review fetched in ${Date.now() - t0}ms`)
    const review = reviewResult.rows[0]

    if (!review) return res.status(404).json({ error: 'Review not found' })
    if (review.paid) return res.status(400).json({ error: 'Already paid', redirect: `/results/${review_id}` })

    const variant = await getVariant(review.variant)
    const priceCents = variant?.config?.price_cents || 1900
    console.log(`[checkout] Variant fetched in ${Date.now() - t0}ms, price=${priceCents}`)

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

    if (email) {
      await db.execute({ sql: 'UPDATE reviews SET email = ? WHERE id = ?', args: [email, review_id] })
    }

    console.log(`[checkout] Calling Stripe at ${Date.now() - t0}ms`)
    const sessionParams = {
      payment_method_types: ['card'],
      line_items: [{
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
      }],
      mode: 'payment',
      success_url: `${baseUrl}/results/${review_id}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pay/${review_id}`,
      metadata: { review_id, variant: review.variant },
    }

    if (email) sessionParams.customer_email = email

    const session = await stripe.checkout.sessions.create(sessionParams)
    console.log(`[checkout] Stripe session created in ${Date.now() - t0}ms`)

    await logEvent('checkout_start', review_id, review.variant, { session_id: session.id, price_cents: priceCents })

    console.log(`[checkout] DONE in ${Date.now() - t0}ms`)
    return res.status(200).json({ checkout_url: session.url })
  } catch (err) {
    console.error(`[checkout] ERROR at ${Date.now() - t0}ms:`, err)
    return res.status(500).json({ error: err.message })
  }
}
