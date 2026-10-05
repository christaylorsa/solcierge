/**
 * Rules for the paperwork the desk shares with a member: which files are accepted,
 * how big, and where they live in Storage.
 *
 * The type is decided by the file extension, never by what the browser claims, and
 * must match the bucket's allowed_mime_types (supabase/schema.sql). Import-free so
 * it is unit-tested directly.
 */
export const DOCUMENTS_BUCKET = 'booking-documents'

/** Matches the bucket's file_size_limit. */
export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024

const TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  heic: 'image/heic',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  txt: 'text/plain',
  ics: 'text/calendar',
  pkpass: 'application/vnd.apple.pkpass',
}

/** Shown in the upload picker. */
export const ACCEPTED_EXTENSIONS = Object.keys(TYPES).map((ext) => `.${ext}`).join(',')

/** Types a browser can show in a tab. Everything else is served as a download. */
const INLINE = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp'])

function extension(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  return dot === -1 ? '' : fileName.slice(dot + 1).toLowerCase()
}

/** The content type for an accepted file, or null when the extension is not allowed. */
export function contentTypeFor(fileName: string): string | null {
  return TYPES[extension(fileName)] ?? null
}

export function opensInline(contentType: string): boolean {
  return INLINE.has(contentType)
}

/**
 * A file name safe to use as a Storage key: ASCII letters, digits, dot, dash and
 * underscore, at most 100 characters, extension kept.
 */
export function safeFileName(fileName: string): string {
  const ext = extension(fileName)
  const base = (ext ? fileName.slice(0, -(ext.length + 1)) : fileName)
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 90)
  return `${base || 'document'}${ext ? `.${ext}` : ''}`
}

/** A display title from a file name: no extension, separators turned into spaces. */
export function titleFromFileName(fileName: string): string {
  const ext = extension(fileName)
  const base = ext ? fileName.slice(0, -(ext.length + 1)) : fileName
  return base.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) || 'Document'
}

/** Every file of a booking sits under its id, so the path proves which booking it belongs to. */
export function documentPath(requestId: string, uniqueId: string, fileName: string): string {
  return `${requestId}/${uniqueId}-${safeFileName(fileName)}`
}

const PATH = /^([0-9a-f-]{36})\/[0-9a-f-]{36}-[\w.-]{1,110}$/i

/** True when `path` is one documentPath() could have produced for this booking. */
export function isPathForRequest(path: string, requestId: string): boolean {
  const match = PATH.exec(path)
  return match !== null && match[1].toLowerCase() === requestId.toLowerCase() && !path.includes('..')
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
