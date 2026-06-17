import { getDb } from '../../lib/db'
export default async function handler(req, res) {
  if (req.query.secret !== process.env.ADMIN_SECRET) return res.status(401).end()
  const db = await getDb()
  const variants = await db.execute('SELECT id, config_json FROM ab_variants')
  for (const row of variants.rows) {
    const cfg = JSON.parse(row.config_json)
    cfg.price_cents = 1900
    if (row.id === 'variant_a') cfg.cta_text = 'Review My Contract — $19'
    await db.execute({ sql: 'UPDATE ab_variants SET config_json = ? WHERE id = ?', args: [JSON.stringify(cfg), row.id] })
  }
  const check = await db.execute('SELECT id, config_json FROM ab_variants')
  return res.status(200).json({ updated: check.rows.map(r => ({ id: r.id, price: JSON.parse(r.config_json).price_cents })) })
}
