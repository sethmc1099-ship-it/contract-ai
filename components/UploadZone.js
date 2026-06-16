import { useState, useRef, useCallback } from 'react'

const ACCEPTED_TYPES = {
  'application/pdf': '.pdf',
  'text/plain': '.txt',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
}

const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export default function UploadZone({ onUpload, variant }) {
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef(null)

  const validateFile = (f) => {
    if (!f) return 'No file selected'
    if (f.size > MAX_SIZE) return `File too large. Maximum size is 10MB (this file is ${(f.size / 1024 / 1024).toFixed(1)}MB)`
    const ext = f.name.split('.').pop().toLowerCase()
    if (!['pdf', 'txt', 'doc', 'docx'].includes(ext)) {
      return 'Unsupported file type. Please upload a PDF, DOC, DOCX, or TXT file.'
    }
    return null
  }

  const handleFile = useCallback((f) => {
    const err = validateFile(f)
    if (err) {
      setError(err)
      return
    }
    setError('')
    setFile(f)
  }, [])

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0]
    handleFile(dropped)
  }

  const handleInputChange = (e) => {
    handleFile(e.target.files[0])
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setProgress(0)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (variant) formData.append('variant', variant)

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(p => Math.min(p + 10, 85))
      }, 300)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setProgress(100)

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Upload failed')
      }

      const data = await res.json()
      onUpload(data)
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.')
      setUploading(false)
      setProgress(0)
    }
  }

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  }

  return (
    <div className="w-full">
      {!file ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-emerald-500 bg-emerald-50'
              : 'border-gray-300 bg-gray-50 hover:border-emerald-400 hover:bg-green-50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.doc,.docx"
            onChange={handleInputChange}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isDragging ? 'bg-emerald-100' : 'bg-gray-100'}`}>
              <svg className={`w-8 h-8 ${isDragging ? 'text-emerald-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-700">
                {isDragging ? 'Drop your contract here' : 'Drag & drop your contract'}
              </p>
              <p className="text-gray-500 mt-1">or <span className="text-emerald-600 font-medium">click to browse</span></p>
            </div>
            <div className="flex gap-3 flex-wrap justify-center">
              {['PDF', 'DOC', 'DOCX', 'TXT'].map(type => (
                <span key={type} className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded font-mono">
                  .{type.toLowerCase()}
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-400">Maximum file size: 10MB</p>
          </div>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl p-6 bg-white">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{file.name}</p>
              <p className="text-sm text-gray-500">{formatSize(file.size)}</p>
              {uploading && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Uploading & extracting text...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%`, backgroundColor: '#10b981' }}
                    />
                  </div>
                </div>
              )}
            </div>
            {!uploading && (
              <button
                onClick={() => { setFile(null); setError('') }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {!uploading && (
            <button
              onClick={handleUpload}
              className="mt-4 w-full text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
              style={{ backgroundColor: '#10b981' }}
              onMouseOver={e => e.target.style.backgroundColor = '#059669'}
              onMouseOut={e => e.target.style.backgroundColor = '#10b981'}
            >
              Analyze This Contract &rarr;
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  )
}
