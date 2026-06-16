let _db = null

function getDb() {
  if (_db) return _db

  // Lazy-require server-only native modules so they never end up in the client bundle
  const Database = require('better-sqlite3')
  const path = require('path')
  const fs = require('fs')

  const DATA_DIR = path.join(process.cwd(), 'data')
  const DB_PATH = path.join(DATA_DIR, 'contractai.db')

  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }

  _db = new Database(DB_PATH)
  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')

  // Create tables
  _db.exec(`
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
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at INTEGER DEFAULT (unixepoch()),
      event TEXT,
      review_id TEXT,
      variant TEXT,
      data TEXT
    );

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
    );

    CREATE TABLE IF NOT EXISTS optimization_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at INTEGER DEFAULT (unixepoch()),
      action TEXT,
      reason TEXT,
      data TEXT
    );
  `)

  // Seed initial A/B variants if none exist
  const variantCount = _db.prepare('SELECT COUNT(*) as cnt FROM ab_variants').get()
  if (variantCount.cnt === 0) {
    const insertVariant = _db.prepare(`
      INSERT INTO ab_variants (id, name, config_json, active)
      VALUES (?, ?, ?, 1)
    `)
    insertVariant.run('variant_a', 'Variant A - Protection', JSON.stringify({
      headline: 'Protect Yourself Before You Sign',
      subheadline: 'Upload your contract. Get a full legal risk analysis in 60 seconds. No lawyer needed.',
      price_cents: 1900,
      cta_text: 'Review My Contract — $19',
      value_prop: 'peace of mind',
    }))
    insertVariant.run('variant_b', 'Variant B - AI Lawyer', JSON.stringify({
      headline: 'Your AI Lawyer for $29',
      subheadline: 'Instant contract review powered by AI trained on thousands of legal documents.',
      price_cents: 2900,
      cta_text: 'Get My Contract Reviewed',
      value_prop: 'professional legitimacy',
    }))
    insertVariant.run('variant_c', 'Variant C - Risk Discovery', JSON.stringify({
      headline: 'Spot Hidden Risks in Your Contract',
      subheadline: 'Most people sign contracts without reading every clause. We read them all for you.',
      price_cents: 1499,
      cta_text: 'Start Free Preview',
      value_prop: 'fear of missing risk',
    }))
  }

  return _db
}

function logEvent(event, reviewId, variant, data) {
  try {
    const db = getDb()
    db.prepare(`
      INSERT INTO events (event, review_id, variant, data)
      VALUES (?, ?, ?, ?)
    `).run(event, reviewId || null, variant || null, data ? JSON.stringify(data) : null)
  } catch (err) {
    console.error('Failed to log event:', err)
  }
}

function getVariant(id) {
  const db = getDb()
  const row = db.prepare('SELECT * FROM ab_variants WHERE id = ?').get(id)
  if (!row) return null
  return { ...row, config: JSON.parse(row.config_json) }
}

function getAllVariants() {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM ab_variants ORDER BY created_at ASC').all()
  return rows.map(r => ({ ...r, config: JSON.parse(r.config_json) }))
}

function getStats() {
  const db = getDb()

  const now = Math.floor(Date.now() / 1000)
  const dayAgo = now - 86400
  const weekAgo = now - 604800
  const monthAgo = now - 2592000

  const revenueAll = db.prepare(`SELECT COALESCE(SUM(price_paid),0) as total FROM reviews WHERE paid=1`).get()
  const revenueToday = db.prepare(`SELECT COALESCE(SUM(price_paid),0) as total FROM reviews WHERE paid=1 AND created_at >= ?`).get(dayAgo)
  const revenueWeek = db.prepare(`SELECT COALESCE(SUM(price_paid),0) as total FROM reviews WHERE paid=1 AND created_at >= ?`).get(weekAgo)
  const revenueMonth = db.prepare(`SELECT COALESCE(SUM(price_paid),0) as total FROM reviews WHERE paid=1 AND created_at >= ?`).get(monthAgo)

  const visits = db.prepare(`SELECT COUNT(*) as cnt FROM events WHERE event='visit'`).get()
  const uploads = db.prepare(`SELECT COUNT(*) as cnt FROM events WHERE event='upload'`).get()
  const checkouts = db.prepare(`SELECT COUNT(*) as cnt FROM events WHERE event='checkout_start'`).get()
  const payments = db.prepare(`SELECT COUNT(*) as cnt FROM events WHERE event='payment_success'`).get()

  const recentReviews = db.prepare(`
    SELECT id, created_at, document_name, status, paid, price_paid, variant, rating
    FROM reviews ORDER BY created_at DESC LIMIT 20
  `).all()

  const optimizationLog = db.prepare(`
    SELECT * FROM optimization_log ORDER BY created_at DESC LIMIT 50
  `).all()

  const variants = getAllVariants()

  return {
    revenue: {
      today: revenueToday.total,
      week: revenueWeek.total,
      month: revenueMonth.total,
      all_time: revenueAll.total,
    },
    funnel: {
      visits: visits.cnt,
      uploads: uploads.cnt,
      checkouts: checkouts.cnt,
      payments: payments.cnt,
    },
    recent_reviews: recentReviews,
    optimization_log: optimizationLog,
    variants,
  }
}

module.exports = { getDb, logEvent, getVariant, getAllVariants, getStats }
