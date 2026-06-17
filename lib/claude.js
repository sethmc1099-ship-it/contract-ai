const Anthropic = require('@anthropic-ai/sdk')

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are an expert contract attorney with 20 years of experience reviewing residential and commercial leases, service agreements, NDAs, and business contracts. Your job is to protect the client by identifying risks, unfair clauses, and missing protections.

You always return well-structured, actionable analysis in valid JSON format. You are thorough, precise, and use plain English so non-lawyers can understand. You never give legal advice to retain a specific attorney, but you do flag when professional review is strongly recommended.`

async function analyzeContract(documentText, documentName) {
  const truncatedText = documentText.length > 80000
    ? documentText.substring(0, 80000) + '\n\n[Document truncated for analysis — first 80,000 characters shown]'
    : documentText

  const userPrompt = `Analyze this contract. Return ONLY compact valid JSON — no markdown, no extra text. Be concise: short explanations, max 5 key_findings, clause quotes under 80 chars.

Document: ${documentName}

${truncatedText}

JSON structure:
{
  "document_type": "Residential Lease|Commercial Lease|NDA|Service Agreement|Employment Contract|Other",
  "overall_risk": "Low|Medium|High|Critical",
  "risk_score": 0-100,
  "executive_summary": "2 sentences max: what it is and biggest concern",
  "key_findings": [
    {"type": "risk|missing|unusual","severity": "low|medium|high|critical","title": "short","clause": "quote under 80 chars","explanation": "plain english, 1 sentence","recommendation": "1 sentence action"}
  ],
  "negotiation_points": ["top 3 things to negotiate, each under 15 words"],
  "should_sign": false,
  "lawyer_review_recommended": true
}`

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
      messages: [{ role: 'user', content: userPrompt }],
      system: SYSTEM_PROMPT,
    })

    const rawText = message.content[0].text.trim()

    // Strip markdown code blocks if present
    let jsonText = rawText
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    const parsed = JSON.parse(jsonText)

    // Validate required fields
    if (!parsed.document_type || !parsed.overall_risk || !parsed.executive_summary) {
      throw new Error('Missing required fields in response')
    }

    return { success: true, data: parsed }
  } catch (err) {
    console.error('Claude analysis error:', err)
    return {
      success: false,
      error: err.message,
      data: {
        document_type: 'Other',
        overall_risk: 'Unknown',
        risk_score: 50,
        executive_summary: 'Analysis could not be completed. Please try again or contact support.',
        key_findings: [],
        missing_protections: [],
        negotiation_points: [],
        should_sign: false,
        lawyer_review_recommended: true,
        lawyer_review_reason: 'Automated analysis failed — professional review is recommended.',
      },
    }
  }
}

async function generateVariantCopy(existingVariants) {
  const variantSummaries = existingVariants.map(v => ({
    headline: v.config.headline,
    price_cents: v.config.price_cents,
    cta_text: v.config.cta_text,
    conversion_rate: v.visits > 0 ? ((v.conversions / v.visits) * 100).toFixed(1) + '%' : 'N/A',
  }))

  const prompt = `You are a conversion rate optimization expert. Generate a new A/B test variant for a contract review SaaS.

The current variants and their performance are:
${JSON.stringify(variantSummaries, null, 2)}

Create a new variant that could outperform them. Return ONLY valid JSON with this structure:
{
  "headline": "compelling headline",
  "subheadline": "supporting text under headline",
  "price_cents": 1999,
  "cta_text": "CTA button text",
  "value_prop": "core psychological angle used"
}

Rules:
- Price should be between 999 and 4900 cents
- Focus on a different psychological angle than existing variants: fear of loss, time savings, professional legitimacy, money saved vs lawyer fees, or peace of mind
- Headline should be direct and benefit-focused
- CTA text must never imply anything is free, instant-access, or a preview — this is a paid service with no free tier
- CTA should create urgency or clarity
- Do not repeat an existing headline`

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })

    let text = message.content[0].text.trim()
    if (text.startsWith('```')) {
      text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }
    return JSON.parse(text)
  } catch (err) {
    console.error('Failed to generate variant copy:', err)
    return null
  }
}

module.exports = { analyzeContract, generateVariantCopy }
