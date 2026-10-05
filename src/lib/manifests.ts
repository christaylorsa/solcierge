import { serverEnv } from '@/lib/env'
import { purgeAfter, type Passenger } from '@/lib/passengers'
import { seal, unseal } from '@/lib/seal'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Passenger manifests: sealed on the way in, unsealed only on the server, for the
 * booking's owner (while they can still edit) or the desk. Expired manifests are
 * never returned, whether or not the nightly purge has run yet.
 */
export type Manifest = {
  request_id: string
  /** Null when the data cannot be decrypted (SESSION_SECRET was rotated). */
  passengers: Passenger[] | null
  passenger_count: number
  submitted_at: string
  updated_at: string
}

type Row = {
  request_id: string
  passengers_sealed: string
  passenger_count: number
  submitted_at: string
  updated_at: string
}

const COLUMNS = 'request_id, passengers_sealed, passenger_count, submitted_at, updated_at'

function open(row: Row): Manifest {
  const { passengers_sealed, ...rest } = row
  return { ...rest, passengers: unseal<Passenger[]>(passengers_sealed, serverEnv().sessionSecret) }
}

export async function getManifest(requestId: string): Promise<Manifest | null> {
  const { data, error } = await supabaseAdmin()
    .from('booking_manifests')
    .select(COLUMNS)
    .eq('request_id', requestId)
    .gt('purge_after', new Date().toISOString())
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? open(data as Row) : null
}

/** For the desk. Deletes anything past its date first, so expired data never lingers. */
export async function getManifests(requestIds: string[]): Promise<Map<string, Manifest>> {
  const db = supabaseAdmin()
  const purged = await db.from('booking_manifests').delete().lt('purge_after', new Date().toISOString())
  if (purged.error) throw new Error(purged.error.message)
  if (requestIds.length === 0) return new Map()

  const { data, error } = await db.from('booking_manifests').select(COLUMNS).in('request_id', requestIds)
  if (error) throw new Error(error.message)
  return new Map((data as Row[]).map((row) => [row.request_id, open(row)]))
}

export async function saveManifest(requestId: string, passengers: Passenger[], travelDate: string | null) {
  const now = new Date()
  const { error } = await supabaseAdmin()
    .from('booking_manifests')
    .upsert(
      {
        request_id: requestId,
        passengers_sealed: seal(passengers, serverEnv().sessionSecret),
        passenger_count: passengers.length,
        purge_after: purgeAfter(travelDate, now).toISOString(),
        updated_at: now.toISOString(),
      },
      { onConflict: 'request_id' },
    )
  if (error) throw new Error(error.message)
}

export async function deleteManifest(requestId: string) {
  const { error } = await supabaseAdmin().from('booking_manifests').delete().eq('request_id', requestId)
  if (error) throw new Error(error.message)
}
