const fs = require('fs')

async function extractTextFromBuffer(buffer) {
  try {
    // pdf-parse has issues with its test file path in some environments
    // We import it dynamically to handle this
    const pdfParse = require('pdf-parse')
    const data = await pdfParse(buffer)
    return {
      success: true,
      text: data.text,
      numPages: data.numpages,
      info: data.info || {},
    }
  } catch (err) {
    console.error('PDF parse error:', err)
    return {
      success: false,
      error: err.message,
      text: '',
      numPages: 0,
      info: {},
    }
  }
}

async function extractTextFromFile(filepath) {
  try {
    const buffer = fs.readFileSync(filepath)
    return await extractTextFromBuffer(buffer)
  } catch (err) {
    console.error('File read error:', err)
    return {
      success: false,
      error: err.message,
      text: '',
      numPages: 0,
      info: {},
    }
  }
}

module.exports = { extractTextFromBuffer, extractTextFromFile }
