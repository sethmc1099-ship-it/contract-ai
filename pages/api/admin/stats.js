import { getStats } from '../../../lib/db'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { secret } = req.query

  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const stats = await getStats()
    return res.status(200).json(stats)
  } catch (err) {
    console.error('Stats error:', err)
    return res.status(500).json({ error: err.message })
  }
}
