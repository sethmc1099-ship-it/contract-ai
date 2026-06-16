import { runOptimizer } from '../../lib/optimizer'

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

  const { secret } = body || {}

  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const result = await runOptimizer()
    return res.status(200).json(result)
  } catch (err) {
    console.error('Optimize error:', err)
    return res.status(500).json({ error: err.message })
  }
}
