import Link from 'next/link'

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header style={{ backgroundColor: '#0f172a' }} className="text-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#10b981' }}>
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-xl font-bold">ContractAI</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/#how-it-works" className="text-gray-300 hover:text-white transition-colors">How It Works</Link>
            <Link href="/#pricing" className="text-gray-300 hover:text-white transition-colors">Pricing</Link>
            <Link href="/review" className="text-white font-semibold px-4 py-2 rounded-lg transition-colors" style={{ backgroundColor: '#10b981' }}>
              Review a Contract
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        {children}
      </main>
      <footer style={{ backgroundColor: '#0f172a' }} className="text-gray-400 py-10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: '#10b981' }}>
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-white font-semibold">ContractAI</span>
            </div>
            <div className="flex gap-6 text-sm">
              <Link href="/#how-it-works" className="hover:text-white transition-colors">How It Works</Link>
              <Link href="/#pricing" className="hover:text-white transition-colors">Pricing</Link>
              <Link href="/#faq" className="hover:text-white transition-colors">FAQ</Link>
            </div>
            <p className="text-sm">&copy; 2025 ContractAI. All rights reserved.</p>
          </div>
          <p className="text-center text-xs mt-6 text-gray-600">
            ContractAI provides AI-powered document analysis for informational purposes only. This is not legal advice. Consult a licensed attorney for legal counsel.
          </p>
        </div>
      </footer>
    </div>
  )
}
