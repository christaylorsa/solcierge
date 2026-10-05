// Builds public/data/airports.json from OurAirports (public domain).
//
//   node scripts/build-airports.mjs
//
// Keeps every large and medium airport, plus small airports that carry an IATA
// code. That covers the business-aviation fields a jet charter actually uses
// (Teterboro, Van Nuys, Le Bourget, Farnborough) without shipping 80k grass
// strips and heliports to the browser.
//
// Each row is [iata, icao, name, city, isoCountry, size, keywords], where size is
// 0 for large, 1 for medium, 2 for small. Country names are resolved in the
// browser with Intl.DisplayNames to keep the file small.

import { writeFile, mkdir } from 'node:fs/promises'

const SOURCE = 'https://davidmegginson.github.io/ourairports-data/airports.csv'
const OUT = new URL('../public/data/airports.json', import.meta.url)
const SIZE = { large_airport: 0, medium_airport: 1, small_airport: 2 }

function parseCsv(text) {
  const rows = []
  let row = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"'
        i += 1
      } else if (ch === '"') {
        quoted = false
      } else {
        cell += ch
      }
    } else if (ch === '"') {
      quoted = true
    } else if (ch === ',') {
      row.push(cell)
      cell = ''
    } else if (ch === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else if (ch !== '\r') {
      cell += ch
    }
  }
  if (cell || row.length) rows.push([...row, cell])
  return rows
}

const res = await fetch(SOURCE)
if (!res.ok) throw new Error(`OurAirports responded ${res.status}`)
const [header, ...records] = parseCsv(await res.text())
const col = Object.fromEntries(header.map((name, index) => [name, index]))

const airports = []
for (const r of records) {
  const size = SIZE[r[col.type]]
  if (size === undefined) continue
  const iata = r[col.iata_code].trim().toUpperCase()
  const icao = (r[col.icao_code] || r[col.gps_code]).trim().toUpperCase()
  if (size === 2 && !iata) continue
  if (!iata && !icao) continue

  airports.push([iata, icao, r[col.name].trim(), r[col.municipality].trim(), r[col.iso_country], size, r[col.keywords].trim()])
}

airports.sort((a, b) => a[5] - b[5] || a[2].localeCompare(b[2]))

await mkdir(new URL('.', OUT), { recursive: true })
await writeFile(OUT, JSON.stringify(airports))
console.log(`Wrote ${airports.length} airports to ${OUT.pathname}`)
