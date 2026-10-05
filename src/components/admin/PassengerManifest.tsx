'use client'

import { useState } from 'react'
import { countryName } from '@/lib/countries'
import { formatDate, formatDateTime, relativeTime } from '@/lib/format'
import type { Passenger } from '@/lib/passengers'

export type ManifestView = {
  passengers: Passenger[] | null
  passenger_count: number
  submitted_at: string
  updated_at: string
}

const HEADER = ['Full name', 'Date of birth', 'Nationality', 'Passport number', 'Passport expiry']

function rowOf(p: Passenger): string[] {
  return [p.full_name, p.date_of_birth, `${countryName(p.nationality)} (${p.nationality})`, p.passport_number, p.passport_expiry]
}

/** The desk's view of a flight's passengers, with a one-click copy for the operator's manifest form. */
export function PassengerManifest({ manifest, waiting }: { manifest: ManifestView | null; waiting: boolean }) {
  const [copied, setCopied] = useState(false)

  if (!manifest) {
    return (
      <p className="text-sm leading-relaxed text-muted">
        {waiting
          ? 'Waiting for the client. They were asked for passenger details when they paid.'
          : 'No passenger details on file.'}
      </p>
    )
  }

  if (!manifest.passengers) {
    return (
      <p className="text-sm leading-relaxed text-danger">
        {manifest.passenger_count} passengers were submitted, but they can no longer be decrypted
        (SESSION_SECRET has changed since). Ask the client to enter them again.
      </p>
    )
  }

  const passengers = manifest.passengers

  async function copy() {
    const text = [HEADER, ...passengers.map(rowOf)].map((cells) => cells.join('\t')).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      window.prompt('Copy the manifest:', text)
    }
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] text-left text-xs">
          <thead>
            <tr className="text-faint">
              {HEADER.map((label) => (
                <th key={label} className="border-b border-line pb-2 pr-4 font-normal tracking-wide">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {passengers.map((p, index) => (
              <tr key={index} className="text-ink">
                <td className="border-b border-line py-2.5 pr-4">{p.full_name}</td>
                <td className="border-b border-line py-2.5 pr-4">{formatDate(p.date_of_birth)}</td>
                <td className="border-b border-line py-2.5 pr-4">{countryName(p.nationality)}</td>
                <td className="border-b border-line py-2.5 pr-4 font-mono select-all">{p.passport_number}</td>
                <td className="border-b border-line py-2.5 pr-4">{formatDate(p.passport_expiry)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button type="button" onClick={() => void copy()} className="btn btn-ghost !py-2.5 !px-4">
          {copied ? 'Copied' : 'Copy for the operator'}
        </button>
        <span className="text-xs text-faint" title={formatDateTime(manifest.updated_at)}>
          {Date.parse(manifest.updated_at) - Date.parse(manifest.submitted_at) > 5000 ? 'Updated' : 'Submitted'} {relativeTime(manifest.updated_at)}.
          Pastes into a spreadsheet or email as a table.
        </span>
      </div>
    </div>
  )
}
