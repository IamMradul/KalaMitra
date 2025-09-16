// Lightweight client-side image features for similarity

export type ImageFeatures = {
  avgColor: { r: number; g: number; b: number }
  aHash: string // 64-bit perceptual hash as 16-hex chars
}

export async function extractImageFeatures(imageUrl: string): Promise<ImageFeatures | null> {
  try {
    const img = await loadImage(imageUrl)
    const avgColor = computeAverageColor(img)
    const aHash = computeAverageHash(img)
    return { avgColor, aHash }
  } catch (e) {
    console.error('extractImageFeatures failed', e)
    return null
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

function computeAverageColor(img: HTMLImageElement): { r: number; g: number; b: number } {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  canvas.width = 16
  canvas.height = 16
  ctx.drawImage(img, 0, 0, 16, 16)
  const data = ctx.getImageData(0, 0, 16, 16).data
  let r = 0, g = 0, b = 0, n = 0
  for (let i = 0; i < data.length; i += 4) {
    r += data[i]
    g += data[i + 1]
    b += data[i + 2]
    n++
  }
  return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) }
}

function computeAverageHash(img: HTMLImageElement): string {
  // aHash: 8x8 grayscale average, bits by pixel > avg
  const size = 8
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  canvas.width = size
  canvas.height = size
  ctx.drawImage(img, 0, 0, size, size)
  const data = ctx.getImageData(0, 0, size, size).data
  const gray: number[] = []
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2]
    // luminance
    gray.push(Math.round(0.299 * r + 0.587 * g + 0.114 * b))
  }
  const avg = gray.reduce((a, c) => a + c, 0) / gray.length
  let bits = ''
  for (const v of gray) bits += v > avg ? '1' : '0'
  // convert 64 bits to hex string
  let hex = ''
  for (let i = 0; i < 64; i += 4) {
    const nibble = bits.slice(i, i + 4)
    hex += parseInt(nibble, 2).toString(16)
  }
  return hex
}

export function colorDistance(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }): number {
  const dr = a.r - b.r
  const dg = a.g - b.g
  const db = a.b - b.b
  return Math.sqrt(dr * dr + dg * dg + db * db) // 0..~441
}

export function hammingDistanceHex(aHashHexA: string, aHashHexB: string): number {
  // compare as 64-bit (16 hex chars); handle length mismatch defensively
  const len = Math.min(aHashHexA.length, aHashHexB.length)
  let dist = 0
  for (let i = 0; i < len; i++) {
    const na = parseInt(aHashHexA[i], 16)
    const nb = parseInt(aHashHexB[i], 16)
    const x = na ^ nb
    dist += popcount4(x)
  }
  return dist
}

function popcount4(n: number): number {
  // n is 0..15
  const table = [0,1,1,2,1,2,2,3,1,2,2,3,2,3,3,4]
  return table[n & 0xF]
}


