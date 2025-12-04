/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_VERCEL_URL: process.env.VERCEL_URL || "plan-de-classe.vercel.app",
  },
  webpack: (config, { isServer }) => {
    // Customisations webpack si nécessaire
    return config
  },
}

module.exports = nextConfig
