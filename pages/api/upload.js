import { IncomingForm } from 'formidable'
import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { getDb, logEvent } from '../../lib/db'

export const config = {
  api: { bodyParser: false },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const form = new IncomingForm({
    maxFileSize: 10 * 1024 * 1024, // 10MB
    keepExtensions: true,
  })

  let fields, files
  try {
    [fields, files] = await form.parse(req)
  } catch (err) {
    return res.status(400).json({ error: 'Failed to parse upload: ' + err.message })
  }

  const fileArray = files.file
  if (!fileArray || fileArray.length === 0) {
    return res.status(400).json({ error: 'No file uploaded' })
  }

  const file = fileArray[0]
  const originalName = file.originalFilename || 'unknown'
  const ext = path.extname(originalName).toLowerCase()
  const tmpPath = file.filepath

  let documentText = ''
  let numPages = 0

  try {
    if (ext === '.pdf') {
      const { extractTextFromFile } = require('../../lib/pdfParser')
      const result = await extractTextFromFile(tmpPath)
      if (!result.success || !result.text.trim()) {
        return res.status(422).json({ error: 'Could not extract text from PDF. Please ensure the PDF contains selectable text (not a scanned image).' })
      }
      documentText = result.text
      numPages = result.numPages
    } else if (ext === '.txt') {
      documentText = fs.readFileSync(tmpPath, 'utf-8')
    } else if (ext === '.doc' || ext === '.docx') {
      // Basic text extraction attempt for DOC/DOCX
      // For a full implementation, mammoth or docx2txt would be used
      // Here we try to read the raw text content
      const buffer = fs.readFileSync(tmpPath)
      // Try to extract readable text from docx (which is a zip file containing XML)
      const text = buffer.toString('utf-8', 0, Math.min(buffer.length, 100000))
      // Extract text between XML tags
      const stripped = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      if (stripped.length < 50) {
        return res.status(422).json({ error: 'Could not extract text from DOC/DOCX. For best results, please save your document as a PDF or TXT file.' })
      }
      documentText = stripped
    } else {
      return res.status(422).json({ error: `Unsupported file type: ${ext}. Please upload a PDF, DOC, DOCX, or TXT file.` })
    }

    if (documentText.trim().length < 100) {
      return res.status(422).json({ error: 'The document appears to be empty or too short for analysis.' })
    }

    // Create review record
    const reviewId = uuidv4()
    const variantId = (fields.variant && fields.variant[0]) || req.cookies?.['contract_ai_variant'] || 'variant_a'

    const db = await getDb()
    await db.execute({
      sql: `INSERT INTO reviews (id, document_name, document_text, status, variant) VALUES (?, ?, ?, 'pending', ?)`,
      args: [reviewId, originalName, documentText, variantId],
    })

    await logEvent('upload', reviewId, variantId, { document_name: originalName, num_pages: numPages })

    // Clean up temp file
    try { fs.unlinkSync(tmpPath) } catch (e) {}

    return res.status(200).json({
      review_id: reviewId,
      document_name: originalName,
      num_pages: numPages,
      variant: variantId,
    })
  } catch (err) {
    console.error('Upload error:', err)
    try { fs.unlinkSync(tmpPath) } catch (e) {}
    return res.status(500).json({ error: 'Server error: ' + err.message })
  }
}
