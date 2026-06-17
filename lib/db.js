// Use HTTP-based client for reliable serverless performance (no WebSocket hanging)
const { createClient } = require('@libsql/client/web')

let _client = null
let _initialized = false
let _initPromise = null

async function getDb() {
  if (!_client) {
    const url = process.env.TURSO_DATABASE_URL
    if (!url) throw new Error('TURSO_DATABASE_URL is not set')
    _client = createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN || undefined,
    })
  }
  if (!_initialized) {
    if (!_initPromise) {
      _initPromise = initDb(_client)
        .then(() => { _initialized = true })
        .catch(err => { _initPromise = null; throw err })
    }
    await _initPromise
  }
  return _client
}

async function initDb(client) {
  // Run creates in parallel for speed
  await Promise.all([
    client.execute(`
      CREATE TABLE IF NOT EXISTS unlimited_buyers (
        email TEXT PRIMARY KEY,
        created_at INTEGER DEFAULT (unixepoch()),
        payment_intent TEXT
      )
    `),
    client.execute(`
      CREATE TABLE IF NOT EXISTS reviews (
        id TEXT PRIMARY KEY,
        created_at INTEGER DEFAULT (unixepoch()),
        status TEXT DEFAULT 'pending',
        document_name TEXT,
        document_text TEXT,
        result_json TEXT,
        email TEXT,
        paid INTEGER DEFAULT 0,
        payment_intent TEXT,
        price_paid INTEGER DEFAULT 0,
        variant TEXT DEFAULT 'a',
        rating INTEGER
      )
    `),
    client.execute(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at INTEGER DEFAULT (unixepoch()),
        event TEXT,
        review_id TEXT,
        variant TEXT,
        data TEXT
      )
    `),
    client.execute(`
      CREATE TABLE IF NOT EXISTS ab_variants (
        id TEXT PRIMARY KEY,
        name TEXT,
        config_json TEXT,
        visits INTEGER DEFAULT 0,
        conversions INTEGER DEFAULT 0,
        revenue INTEGER DEFAULT 0,
        active INTEGER DEFAULT 1,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      )
    `),
    client.execute(`
      CREATE TABLE IF NOT EXISTS optimization_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at INTEGER DEFAULT (unixepoch()),
        action TEXT,
        reason TEXT,
        data TEXT
      )
    `),
  ])

  // Seed variants if none exist
  const countResult = await client.execute('SELECT COUNT(*) as cnt FROM ab_variants')
  if (Number(countResult.rows[0].cnt) === 0) {
    await Promise.all([
      client.execute({
        sql: `INSERT INTO ab_variants (id, name, config_json, active) VALUES (?, ?, ?, 1)`,
        args: ['variant_a', 'Variant A - Protection', JSON.stringify({
          headline: 'Protect Yourself Before You Sign',
          subheadline: 'Upload your contract. Get a full legal risk analysis in 60 seconds. No lawyer needed.',
          price_cents: 1900,
          cta_text: 'Review My Contract — $19',
          value_prop: 'peace of mind',
        })],
      }),
      client.execute({
        sql: `INSERT INTO ab_variants (id, name, config_json, active) VALUES (?, ?, ?, 1)`,
        args: ['variant_b', 'Variant B - AI Lawyer', JSON.stringify({
          headline: 'AI Contract Review. Lawyer-Level Analysis.',
          subheadline: 'Instant contract review powered by AI trained on thousands of legal documents.',
          price_cents: 1900,
          cta_text: 'Get My Contract Reviewed',
          value_prop: 'professional legitimacy',
        })],
      }),
      client.execute({
        sql: `INSERT INTO ab_variants (id, name, config_json, active) VALUES (?, ?, ?, 1)`,
        args: ['variant_c', 'Variant C - Risk Discovery', JSON.stringify({
          headline: 'Spot Hidden Risks in Your Contract',
          subheadline: 'Most people sign contracts without reading every clause. We read them all for you.',
          price_cents: 1900,
          cta_text: 'Review My Contract Now',
          value_prop: 'fear of missing risk',
        })],
      }),
    ])
  }
}

async function logEvent(event, reviewId, variant, data) {
  try {
    const db = await getDb()
    await db.execute({
      sql: `INSERT INTO events (event, review_id, variant, data) VALUES (?, ?, ?, ?)`,
      args: [event, reviewId || null, variant || null, data ? JSON.stringify(data) : null],
    })
  } catch (err) {
    console.error('Failed to log event:', err)
  }
}

async function getVariant(id) {
  const db = await getDb()
  const result = await db.execute({ sql: 'SELECT * FROM ab_variants WHERE id = ?', args: [id] })
  const row = result.rows[0]
  if (!row) return null
  return { ...row, config: JSON.parse(row.config_json) }
}

async function getAllVariants() {
  const db = await getDb()
  const result = await db.execute('SELECT * FROM ab_variants ORDER BY created_at ASC')
  return result.rows.map(r => ({ ...r, config: JSON.parse(r.config_json) }))
}

async function getStats() {
  const db = await getDb()

  const now = Math.floor(Date.now() / 1000)
  const dayAgo = now - 86400
  const weekAgo = now - 604800
  const monthAgo = now - 2592000

  const [revenueAll, revenueToday, revenueWeek, revenueMonth, visits, uploads, checkouts, payments, recentReviews, optimizationLog, variants] = await Promise.all([
    db.execute(`SELECT COALESCE(SUM(price_paid),0) as total FROM reviews WHERE paid=1`),
    db.execute({ sql: `SELECT COALESCE(SUM(price_paid),0) as total FROM reviews WHERE paid=1 AND created_at >= ?`, args: [dayAgo] }),
    db.execute({ sql: `SELECT COALESCE(SUM(price_paid),0) as total FROM reviews WHERE paid=1 AND created_at >= ?`, args: [weekAgo] }),
    db.execute({ sql: `SELECT COALESCE(SUM(price_paid),0) as total FROM reviews WHERE paid=1 AND created_at >= ?`, args: [monthAgo] }),
    db.execute(`SELECT COUNT(*) as cnt FROM events WHERE event='visit'`),
    db.execute(`SELECT COUNT(*) as cnt FROM events WHERE event='upload'`),
    db.execute(`SELECT COUNT(*) as cnt FROM events WHERE event='checkout_start'`),
    db.execute(`SELECT COUNT(*) as cnt FROM events WHERE event='payment_success'`),
    db.execute(`SELECT id, created_at, document_name, status, paid, price_paid, variant, rating FROM reviews ORDER BY created_at DESC LIMIT 20`),
    db.execute(`SELECT * FROM optimization_log ORDER BY created_at DESC LIMIT 50`),
    getAllVariants(),
  ])

  return {
    revenue: {
      today: Number(revenueToday.rows[0].total),
      week: Number(revenueWeek.rows[0].total),
      month: Number(revenueMonth.rows[0].total),
      all_time: Number(revenueAll.rows[0].total),
    },
    funnel: {
      visits: Number(visits.rows[0].cnt),
      uploads: Number(uploads.rows[0].cnt),
      checkouts: Number(checkouts.rows[0].cnt),
      payments: Number(payments.rows[0].cnt),
    },
    recent_reviews: recentReviews.rows,
    optimization_log: optimizationLog.rows,
    variants,
  }
}

async function isUnlimitedBuyer(email) {
  if (!email) return false
  const db = await getDb()
  const result = await db.execute({ sql: 'SELECT email FROM unlimited_buyers WHERE email = ?', args: [email.toLowerCase().trim()] })
  return result.rows.length > 0
}

async function addUnlimitedBuyer(email, paymentIntent) {
  const db = await getDb()
  await db.execute({
    sql: `INSERT OR REPLACE INTO unlimited_buyers (email, payment_intent) VALUES (?, ?)`,
    args: [email.toLowerCase().trim(), paymentIntent],
  })
}

module.exports = { getDb, logEvent, getVariant, getAllVariants, getStats, isUnlimitedBuyer, addUnlimitedBuyer }
