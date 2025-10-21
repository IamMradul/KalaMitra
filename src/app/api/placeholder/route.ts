import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const width = parseInt(searchParams.get('width') || '800')
  const height = parseInt(searchParams.get('height') || '450')
  const text = searchParams.get('text') || 'KalaMitra Video'

  // Create a simple SVG placeholder
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#bfa14a;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#a94442;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#4a7c59;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad1)"/>
      <circle cx="${width/2}" cy="${height/2 - 20}" r="40" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.4)" stroke-width="2"/>
      <polygon points="${width/2 - 15},${height/2 - 35} ${width/2 - 15},${height/2 - 5} ${width/2 + 15},${height/2 - 20}" fill="rgba(255,255,255,0.8)"/>
      <text x="50%" y="${height/2 + 40}" text-anchor="middle" fill="rgba(255,255,255,0.9)" font-family="Arial, sans-serif" font-size="24" font-weight="bold">${text}</text>
      <text x="50%" y="${height/2 + 70}" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-family="Arial, sans-serif" font-size="16">Traditional Craftsmanship</text>
    </svg>
  `

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000',
    },
  })
}
