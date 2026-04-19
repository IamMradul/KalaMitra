import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  console.warn('Upstash environment variables are missing. Rate limiting will be disabled or fail.')
}

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
})

// Create a new ratelimiter, that allows 10 requests per 10 seconds
export const searchRateLimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  analytics: true,
  prefix: 'ratelimit:search',
})

// Bidding might need slightly higher or special limits
export const auctionRateLimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(5, '10 s'),
  analytics: true,
  prefix: 'ratelimit:auction',
})
