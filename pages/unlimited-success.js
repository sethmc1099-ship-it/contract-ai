import Head from 'next/head'
import Link from 'next/link'
import Layout from '../components/Layout'

export default function UnlimitedSuccess({ email }) {
  return (
    <Layout>
      <Head><title>Welcome to Unlimited — ContractAI</title></Head>
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: '#d1fae5' }}>
          <svg className="w-8 h-8" style={{ color: '#10b981' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">You have unlimited access!</h1>
        <p className="text-gray-600 mb-2">
          Your email <strong>{email}</strong> now has unlimited contract reviews for life.
        </p>
        <p className="text-gray-500 text-sm mb-8">
          Every time you upload a contract and enter this email, your review will be free automatically. No codes, no hassle.
        </p>
        <Link
          href="/review"
          className="inline-block text-white font-bold px-8 py-4 rounded-xl text-lg"
          style={{ backgroundColor: '#10b981' }}
        >
          Review Your First Contract
        </Link>
      </div>
    </Layout>
  )
}

export function getServerSideProps({ query }) {
  return { props: { email: query.email || '' } }
}
