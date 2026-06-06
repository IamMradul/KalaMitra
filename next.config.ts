import type { NextConfig } from "next";

const getSupabaseHost = () => {
  try {
    const env = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
    if (!env) return null
    const u = new URL(env)
    return u.hostname
  } catch {
    return null
  }
}

const nextConfig: NextConfig = {
  // Enable static exports for better Vercel compatibility
  output: 'standalone',
  // Ignore ESLint errors during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Strip console.log / info / debug at build time in production.
  // console.error and console.warn are preserved so real issues stay visible.
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },
  images: {
    // allow external hosts we commonly use for product images
    domains: [
      'kalamitra.store',
      'm.media-amazon.com',
      'tiimg.tistatic.com',
      'encrypted-tbn0.gstatic.com',
      'lh3.googleusercontent.com',
      'images.unsplash.com',
      'cdn.shopify.com',
      'i.imgur.com',
      'upload.wikimedia.org',
      // Supabase storage host used in product images
      'dejyoyoctsfyjixfhfgd.supabase.co',
      // include Supabase project hostname dynamically when provided via env
      ...(getSupabaseHost() ? [getSupabaseHost() as string] : []),
    ],
  },
  // Ensure proper handling of dynamic imports
  transpilePackages: ['react-i18next', 'i18next'],
};

export default nextConfig;
