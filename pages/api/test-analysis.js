// TEMPORARY TESTING ENDPOINT — remove after verification
import { analyzeContract } from '../../lib/claude'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { text, name } = req.body || {}
  if (!text) return res.status(400).json({ error: 'text required' })
  const result = await analyzeContract(text, name || 'test-contract.txt')
  return res.status(200).json(result)
}
