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

  // Tell Vercel's Node File Trace (NFT) to ONLY include the specific 15MB native library
  // This bypasses the 50MB function size limit crash while fixing the Node module error
  outputFileTracingIncludes: {
    '/api/**/*': [
      './node_modules/onnxruntime-node/bin/napi-v3/linux/x64/libonnxruntime.so.1.14.0',
      './node_modules/onnxruntime-node/bin/napi-v3/linux/arm64/libonnxruntime.so.1.14.0'
    ],
  },

  // Fix for @xenova/transformers missing libonnxruntime.so error on Vercel
  serverExternalPackages: ['onnxruntime-node', '@xenova/transformers'],

  // Strip console.log / info / debug at build time in production.
  // console.error and console.warn are preserved so real issues stay visible.
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },

  images: {
    unoptimized: true,
    // Strictly allow only external hosts we use for product images
    remotePatterns: [
      { protocol: 'https', hostname: 'kalamitra.store' },
      { protocol: 'https', hostname: 'm.media-amazon.com' },
      { protocol: 'https', hostname: 'tiimg.tistatic.com' },
      { protocol: 'https', hostname: 'encrypted-tbn0.gstatic.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'cdn.shopify.com' },
      { protocol: 'https', hostname: 'i.imgur.com' },
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
      // Supabase storage host used in product images
      { protocol: 'https', hostname: 'dejyoyoctsfyjixfhfgd.supabase.co' },
      // Include Supabase project hostname dynamically when provided via env
      ...(getSupabaseHost() ? [{ protocol: 'https' as const, hostname: getSupabaseHost() as string }] : []),
    ],
  },
  // Ensure proper handling of dynamic imports
  transpilePackages: ['react-i18next', 'i18next'],
};

export default nextConfig;
