import { getDb } from '../../lib/db'

export default async function handler(req, res) {
  if (req.query.secret !== process.env.ADMIN_SECRET) return res.status(401).end()
  const db = await getDb()
  const newConfig = JSON.stringify({
    headline: 'Spot Hidden Risks in Your Contract',
    subheadline: 'Most people sign contracts without reading every clause. We read them all for you.',
    price_cents: 1499,
    cta_text: 'Review My Contract Now',
    value_prop: 'fear of missing risk',
  })
  await db.execute({ sql: 'UPDATE ab_variants SET config_json = ? WHERE id = ?', args: [newConfig, 'variant_c'] })
  const check = await db.execute({ sql: 'SELECT config_json FROM ab_variants WHERE id = ?', args: ['variant_c'] })
  return res.status(200).json({ updated: true, config: JSON.parse(check.rows[0].config_json) })
}
