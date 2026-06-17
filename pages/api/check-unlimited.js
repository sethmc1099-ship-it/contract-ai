import { isUnlimitedBuyer } from '../../lib/db'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { email } = req.body || {}
  if (!email) return res.status(400).json({ error: 'email required' })
  const unlimited = await isUnlimitedBuyer(email)
  return res.status(200).json({ unlimited })
}
