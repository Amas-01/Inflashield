/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimize font loading
  optimizeFonts: true,
  
  // Webpack config to ignore pg-native warning
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('pg-native')
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
