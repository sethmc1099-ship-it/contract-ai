// TEMPORARY TESTING ENDPOINT — remove after verification
import { analyzeContract } from '../../lib/claude'
import fs from 'fs'
import path from 'path'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  if (req.body?.secret !== process.env.ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized' })

  const { text, name } = req.body
  if (!text) return res.status(400).json({ error: 'text required' })

  const result = await analyzeContract(text, name || 'test-contract.txt')
  return res.status(200).json(result)
}
