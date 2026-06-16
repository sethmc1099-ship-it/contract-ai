import { logEvent } from '../../lib/db'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { event, review_id, variant, data } = req.body || {}
  if (!event) return res.status(400).json({ error: 'event is required' })

  try {
    await logEvent(event, review_id || null, variant || null, data || null)
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('Track error:', err)
    return res.status(500).json({ error: 'Failed to log event' })
  }
}
