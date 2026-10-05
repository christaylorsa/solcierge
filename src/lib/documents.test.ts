import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  contentTypeFor,
  documentPath,
  formatBytes,
  isPathForRequest,
  safeFileName,
  titleFromFileName,
} from './documents.ts'

const REQUEST = '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b'
const OTHER = '0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c3d'
const UNIQUE = '11111111-2222-4333-8444-555555555555'

test('content type comes from the extension, case-insensitively', () => {
  assert.equal(contentTypeFor('E-Ticket.PDF'), 'application/pdf')
  assert.equal(contentTypeFor('boarding.pkpass'), 'application/vnd.apple.pkpass')
  assert.equal(contentTypeFor('photo.jpeg'), 'image/jpeg')
})

test('unlisted and extension-less files are refused', () => {
  assert.equal(contentTypeFor('page.html'), null)
  assert.equal(contentTypeFor('logo.svg'), null)
  assert.equal(contentTypeFor('script.pdf.exe'), null)
  assert.equal(contentTypeFor('README'), null)
})

test('file names are made safe for Storage keys and keep their extension', () => {
  assert.equal(safeFileName('Villa Rosa – check-in (final).pdf'), 'Villa-Rosa-check-in-final.pdf')
  assert.equal(safeFileName('../../etc/passwd.pdf'), 'etc-passwd.pdf')
  assert.equal(safeFileName('.pdf'), 'document.pdf')
  assert.ok(safeFileName(`${'a'.repeat(300)}.pdf`).length <= 94)
})

test('titles drop the extension and separators', () => {
  assert.equal(titleFromFileName('outbound_e-ticket.pdf'), 'outbound e ticket')
  assert.equal(titleFromFileName('.pdf'), 'Document')
})

test('a generated path belongs to its own booking only', () => {
  const path = documentPath(REQUEST, UNIQUE, 'Itinerary.pdf')
  assert.equal(path, `${REQUEST}/${UNIQUE}-Itinerary.pdf`)
  assert.equal(isPathForRequest(path, REQUEST), true)
  assert.equal(isPathForRequest(path, OTHER), false)
})

test('paths outside the pattern are refused', () => {
  assert.equal(isPathForRequest(`${REQUEST}/../${OTHER}/${UNIQUE}-a.pdf`, REQUEST), false)
  assert.equal(isPathForRequest(`${REQUEST}/${UNIQUE}-..pdf`, REQUEST), false)
  assert.equal(isPathForRequest(`${REQUEST}/notes.pdf`, REQUEST), false)
  assert.equal(isPathForRequest(`${REQUEST}/${UNIQUE}-a b.pdf`, REQUEST), false)
})

test('sizes read naturally', () => {
  assert.equal(formatBytes(512), '512 B')
  assert.equal(formatBytes(2048), '2 KB')
  assert.equal(formatBytes(3.4 * 1024 * 1024), '3.4 MB')
})
