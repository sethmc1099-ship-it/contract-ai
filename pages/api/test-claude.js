// TEMP: test Claude API connectivity and model name
import Anthropic from '@anthropic-ai/sdk'

export default async function handler(req, res) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  
  // Try models in order of likelihood
  const models = ['claude-sonnet-4-5', 'claude-opus-4-5', 'claude-haiku-4-5', 'claude-3-7-sonnet-20250219', 'claude-3-5-haiku-20241022']
  
  for (const model of models) {
    try {
      const msg = await client.messages.create({
        model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Say OK' }],
      })
      return res.status(200).json({ working_model: model, response: msg.content[0].text })
    } catch (err) {
      console.log(`Model ${model} failed: ${err.message}`)
    }
  }
  return res.status(500).json({ error: 'No models worked', tried: models })
}
