// Writes assets/card/grain.png: a 160px tile of soft monochrome noise, laid over the
// share card so its gold glow does not band into visible rings once X recompresses
// the image. No dependencies: a greyscale+alpha PNG is a few lines of zlib.
//
//   node scripts/card-grain.mjs
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const SIZE = 160

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc = (buf) => {
  let c = 0xffffffff
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const sum = Buffer.alloc(4)
  sum.writeUInt32BE(crc(body))
  return Buffer.concat([len, body, sum])
}

const header = Buffer.alloc(13)
header.writeUInt32BE(SIZE, 0)
header.writeUInt32BE(SIZE, 4)
header[8] = 8 // bit depth
header[9] = 4 // greyscale + alpha

const rows = []
for (let y = 0; y < SIZE; y++) {
  const row = Buffer.alloc(1 + SIZE * 2)
  for (let x = 0; x < SIZE; x++) {
    const v = Math.random()
    row[1 + x * 2] = v > 0.5 ? 255 : 0
    // Light, uneven speckle: most pixels nearly clear, a few a touch stronger.
    row[2 + x * 2] = Math.round(Math.abs(v - 0.5) * 2 * 22)
  }
  rows.push(row)
}

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', header),
  chunk('IDAT', deflateSync(Buffer.concat(rows), { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
])
writeFileSync(new URL('../assets/card/grain.png', import.meta.url), png)
console.log(`assets/card/grain.png ${png.length} bytes`)
