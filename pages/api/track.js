import { logEvent } from '../../lib/db'

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

  const { event, review_id, variant, data } = body || {}

  if (!event) {
    return res.status(400).json({ error: 'event is required' })
  }

  try {
    await logEvent(event, review_id || null, variant || null, data || null)
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('Track error:', err)
    return res.status(500).json({ error: 'Failed to log event' })
  }
}
