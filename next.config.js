/** @type {import('next').NextConfig} */
const nextConfig = {
  // Security headers applied to all responses
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",     // unsafe-inline needed for Next.js
              "style-src 'self' 'unsafe-inline'",
              [
                "connect-src 'self'",
                'https://api.sosovalue.com',
                'https://testnet-api.sodex.com',
                'https://api.sodex.com',
                'https://v6.exchangerate-api.com',
                'https://api.frankfurter.app',
                'https://api.groq.com',
                'https://generativelanguage.googleapis.com',
                'https://api.anthropic.com',
              ].join(' '),
              "img-src 'self' data:",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
