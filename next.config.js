/** @type {import('next').NextConfig} */
const nextConfig = {
  // Webpack config to ignore pg-native warning and improve compatibility
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude problematic Node.js modules from Edge Runtime
      config.externals.push('pg-native', 'bcryptjs')
    }
    return config
  },
  
  // Allow longer timeouts for slow networks
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
}

module.exports = nextConfig
