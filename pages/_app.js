import '../styles/globals.css'
import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function App({ Component, pageProps }) {
  const router = useRouter()

  useEffect(() => {
    const trackPageView = async () => {
      try {
        await fetch('/api/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'pageview',
            data: { path: router.pathname },
          }),
        })
      } catch (e) {
        // Silently ignore tracking errors
      }
    }
    trackPageView()
  }, [router.pathname])

  return <Component {...pageProps} />
}
