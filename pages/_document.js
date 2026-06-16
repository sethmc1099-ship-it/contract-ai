import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body>
        {/* Immediately remove Next.js FOUC protection so body is always visible */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var fouc = document.querySelector('[data-next-hide-fouc]');
                  if (fouc) fouc.remove();
                } catch(e) {}
              })();
            `,
          }}
        />
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
