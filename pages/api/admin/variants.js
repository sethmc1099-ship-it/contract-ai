import { getAllVariants } from '../../../lib/db'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { secret } = req.query

  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const variants = getAllVariants()
    return res.status(200).json(variants)
  } catch (err) {
    console.error('Variants error:', err)
    return res.status(500).json({ error: err.message })
  }
}
