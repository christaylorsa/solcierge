'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ACCEPTED_EXTENSIONS, DOCUMENTS_BUCKET, MAX_DOCUMENT_BYTES, formatBytes } from '@/lib/documents'
import { formatDate } from '@/lib/format'
import { supabaseBrowser } from '@/lib/supabase/browser'
import type { BookingDocument } from '@/lib/types'

/**
 * What the desk hands the member: the supplier's reference, the itinerary, and the
 * documents. Files go straight from this browser to private Storage through a
 * single-use signed URL; the server then records them.
 */
export function PaperworkEditor({
  requestId,
  confirmationRef,
  itinerary,
  documents,
  memberReach,
}: {
  requestId: string
  confirmationRef: string | null
  itinerary: string | null
  documents: BookingDocument[]
  /** How the member can be told: their linked Telegram and/or an email on file. */
  memberReach: { telegram: boolean; email: boolean }
}) {
  const router = useRouter()
  const fileInput = useRef<HTMLInputElement>(null)
  const [ref, setRef] = useState(confirmationRef ?? '')
  const [notes, setNotes] = useState(itinerary ?? '')
  const [label, setLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [uploading, setUploading] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const [notifying, setNotifying] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const dirty = ref.trim() !== (confirmationRef ?? '') || notes.trim() !== (itinerary ?? '')

  async function call(url: string, init: RequestInit): Promise<Record<string, unknown>> {
    const res = await fetch(url, { ...init, headers: { 'content-type': 'application/json', ...init.headers } })
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (!res.ok) throw new Error(typeof body.error === 'string' ? body.error : 'That did not work. Try again.')
    return body
  }

  async function saveDetails(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      await call(`/api/admin/requests/${requestId}/paperwork`, {
        method: 'PATCH',
        body: JSON.stringify({ confirmation_ref: ref, itinerary: notes }),
      })
      setSavedAt(Date.now())
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return
    setError(null)
    setNotice(null)
    const list = Array.from(files)
    try {
      for (const file of list) {
        if (file.size > MAX_DOCUMENT_BYTES) throw new Error(`${file.name} is over ${formatBytes(MAX_DOCUMENT_BYTES)}.`)
        setUploading(file.name)

        const ticket = (await call(`/api/admin/requests/${requestId}/documents/upload-url`, {
          method: 'POST',
          body: JSON.stringify({ file_name: file.name, size: file.size }),
        })) as { path: string; token: string; content_type: string }

        const put = await supabaseBrowser()
          .storage.from(DOCUMENTS_BUCKET)
          .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: ticket.content_type })
        if (put.error) throw new Error(`${file.name} did not upload: ${put.error.message}`)

        await call(`/api/admin/requests/${requestId}/documents`, {
          method: 'POST',
          body: JSON.stringify({
            path: ticket.path,
            file_name: file.name,
            title: list.length === 1 && label.trim() ? label.trim() : undefined,
          }),
        })
      }
      setLabel('')
      setNotice(`${list.length === 1 ? 'Document' : `${list.length} documents`} added. Tell the client when you are done.`)
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The upload failed.')
      router.refresh()
    } finally {
      setUploading(null)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  async function remove(doc: BookingDocument) {
    if (!window.confirm(`Remove "${doc.title}"? The client will no longer be able to open it.`)) return
    setRemoving(doc.id)
    setError(null)
    setNotice(null)
    try {
      await call(`/api/admin/documents/${doc.id}`, { method: 'DELETE' })
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not remove that document.')
    } finally {
      setRemoving(null)
    }
  }

  async function notify() {
    setNotifying(true)
    setError(null)
    setNotice(null)
    try {
      const body = (await call(`/api/admin/requests/${requestId}/notify`, { method: 'POST' })) as {
        delivered: { telegram: boolean; email: boolean }
      }
      const reached = [body.delivered.telegram && 'Telegram', body.delivered.email && 'email'].filter(Boolean)
      setNotice(
        reached.length > 0
          ? `Client notified by ${reached.join(' and ')}.`
          : 'Nothing was sent: the client has no Telegram linked and no email we can use. They will see it on their booking page next time they sign in.',
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not notify the client.')
    } finally {
      setNotifying(false)
    }
  }

  const reachCopy =
    memberReach.telegram && memberReach.email
      ? 'Client reachable on Telegram and email.'
      : memberReach.telegram
        ? 'Client reachable on Telegram.'
        : memberReach.email
          ? 'Client reachable by email only.'
          : 'Client has no Telegram or email: they only see this on their booking page.'

  return (
    <div className="space-y-7">
      <form onSubmit={saveDetails} className="space-y-5">
        <label className="block">
          <span className="field-label">Booking reference</span>
          <input
            className="field font-mono"
            value={ref}
            onChange={(event) => setRef(event.target.value)}
            placeholder="e.g. VJ-48213 or the operator's confirmation number"
            maxLength={120}
          />
        </label>
        <label className="block">
          <span className="field-label">Itinerary and what the client needs to do</span>
          <textarea
            className="field min-h-[8rem] resize-y leading-relaxed"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={8000}
            placeholder={
              'Wheels up 14:00, Signature FBO Farnborough. Arrive by 13:30 with passports.\nDriver meets you at Nice arrivals with a name board.\nVilla check-in from 16:00, host Marco +33 ...'
            }
          />
          <span className="mt-2 block text-xs text-faint">The client reads this exactly as written.</span>
        </label>
        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" className="btn btn-ghost !py-2.5 !px-4" disabled={saving || !dirty}>
            {saving ? 'Saving' : 'Save details'}
          </button>
          {savedAt && !dirty ? <span className="text-xs text-success">Saved</span> : null}
        </div>
      </form>

      <div className="border-t border-line pt-6">
        <p className="field-label">Documents</p>
        {documents.length > 0 ? (
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {documents.map((doc) => (
              <li key={doc.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <a
                  href={`/api/documents/${doc.id}`}
                  target="_blank"
                  rel="noopener"
                  className="text-sm text-ink transition-colors duration-300 ease hover:text-accent-soft"
                >
                  {doc.title}
                  <span className="ml-2 text-xs text-faint">
                    {formatBytes(Number(doc.size_bytes))} · {formatDate(doc.created_at)}
                  </span>
                </a>
                <button
                  type="button"
                  onClick={() => void remove(doc)}
                  disabled={removing !== null}
                  className="btn btn-quiet !px-0 !py-1 text-xs"
                >
                  {removing === doc.id ? 'Removing' : 'Remove'}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-faint">None yet.</p>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="block">
            <span className="field-label">Label (optional, single file)</span>
            <input
              className="field"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="e.g. E-ticket, outbound"
              maxLength={120}
            />
          </label>
          <label className={`btn btn-primary !py-2.5 cursor-pointer ${uploading ? 'pointer-events-none opacity-60' : ''}`}>
            {uploading ? 'Uploading' : 'Add files'}
            <input
              ref={fileInput}
              type="file"
              multiple
              accept={ACCEPTED_EXTENSIONS}
              className="sr-only"
              disabled={uploading !== null}
              onChange={(event) => void upload(event.target.files)}
            />
          </label>
        </div>
        <p className="mt-2 text-xs text-faint">
          {uploading ? `Uploading ${uploading}…` : `PDF, images, Word, Excel, .ics or Apple Wallet passes, up to ${formatBytes(MAX_DOCUMENT_BYTES)} each.`}
        </p>
      </div>

      <div className="border-t border-line pt-6">
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => void notify()}
            disabled={notifying}
            className="btn btn-ghost !py-2.5 !px-4"
          >
            {notifying ? 'Sending' : 'Tell the client'}
          </button>
          <span className="text-xs text-faint">{reachCopy}</span>
        </div>
      </div>

      {notice ? (
        <p className="border-l-2 border-success pl-4 text-sm text-success" role="status">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="border-l-2 border-danger pl-4 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
