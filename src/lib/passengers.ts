/**
 * Passenger details for a flight: what operators need for the manifest and the
 * advance passenger information sent to border authorities.
 *
 * Import-free (bar the country list) so the rules are unit-tested directly; the
 * browser form and the API both run them, the API being the one that counts.
 */
import { COUNTRY_CODES } from './countries.ts'

export type Passenger = {
  full_name: string
  /** YYYY-MM-DD */
  date_of_birth: string
  /** ISO 3166-1 alpha-2 */
  nationality: string
  passport_number: string
  /** YYYY-MM-DD */
  passport_expiry: string
}

export const MAX_PASSENGERS = 20

/** How long after the last travel date the manifest is kept. */
export const RETENTION_DAYS = 30

export const EMPTY_PASSENGER: Passenger = {
  full_name: '',
  date_of_birth: '',
  nationality: '',
  passport_number: '',
  passport_expiry: '',
}

const DATE = /^\d{4}-\d{2}-\d{2}$/
const PASSPORT = /^[A-Z0-9]{5,20}$/
const COUNTRIES = new Set<string>(COUNTRY_CODES)

function validDate(value: string): boolean {
  if (!DATE.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function normalisePassport(value: string): string {
  return value.replace(/[\s-]+/g, '').toUpperCase()
}

export type PassengerError = { index: number; field: keyof Passenger; message: string }

/**
 * Cleans and checks a list of passengers. `travelDate` is the last day of travel
 * (return date, or departure for one way): a passport must still be valid then.
 */
export function checkPassengers(
  input: unknown,
  options: { today: string; travelDate: string | null },
): { ok: true; passengers: Passenger[] } | { ok: false; error: PassengerError | { index: -1; field: null; message: string } } {
  if (!Array.isArray(input) || input.length === 0) {
    return { ok: false, error: { index: -1, field: null, message: 'Add at least one passenger.' } }
  }
  if (input.length > MAX_PASSENGERS) {
    return { ok: false, error: { index: -1, field: null, message: `Up to ${MAX_PASSENGERS} passengers per booking.` } }
  }

  const passengers: Passenger[] = []
  for (const [index, raw] of input.entries()) {
    const row = (raw ?? {}) as Partial<Record<keyof Passenger, unknown>>
    const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
    const p: Passenger = {
      full_name: text(row.full_name).replace(/\s+/g, ' '),
      date_of_birth: text(row.date_of_birth),
      nationality: text(row.nationality).toUpperCase(),
      passport_number: normalisePassport(text(row.passport_number)),
      passport_expiry: text(row.passport_expiry),
    }
    const fail = (field: keyof Passenger, message: string) => ({ ok: false as const, error: { index, field, message } })
    const who = `Passenger ${index + 1}`

    if (p.full_name.length < 2 || p.full_name.length > 120) return fail('full_name', `${who}: enter the full name exactly as it appears in the passport.`)
    if (!validDate(p.date_of_birth) || p.date_of_birth >= options.today || p.date_of_birth < '1900-01-01') {
      return fail('date_of_birth', `${who}: check the date of birth.`)
    }
    if (!COUNTRIES.has(p.nationality)) return fail('nationality', `${who}: choose a nationality.`)
    if (!PASSPORT.test(p.passport_number)) return fail('passport_number', `${who}: a passport number is 5 to 20 letters and digits.`)
    if (!validDate(p.passport_expiry)) return fail('passport_expiry', `${who}: check the passport expiry date.`)
    const mustLast = options.travelDate && options.travelDate > options.today ? options.travelDate : options.today
    if (p.passport_expiry < mustLast) {
      return fail('passport_expiry', `${who}: this passport expires before the trip ends. A valid passport is needed to fly.`)
    }
    passengers.push(p)
  }
  return { ok: true, passengers }
}

/** True when the passport expires within six months of travel, which some countries refuse. */
export function expiresSoonAfter(expiry: string, travelDate: string | null, today: string): boolean {
  const from = new Date(`${travelDate ?? today}T00:00:00Z`)
  from.setUTCMonth(from.getUTCMonth() + 6)
  return expiry < from.toISOString().slice(0, 10)
}

/** The last day of travel on a flight brief: the return date, else the departure date. */
export function lastTravelDate(details: { trip?: string; start_date?: string; end_date?: string }): string | null {
  if (details.trip !== 'one_way' && details.end_date) return details.end_date
  return details.start_date ?? null
}

/** When a manifest is deleted: RETENTION_DAYS after travel, or 60 days out when no date was given. */
export function purgeAfter(travelDate: string | null, now: Date): Date {
  if (!travelDate || !validDate(travelDate)) return new Date(now.getTime() + 60 * 86_400_000)
  return new Date(Date.parse(`${travelDate}T23:59:59Z`) + RETENTION_DAYS * 86_400_000)
}

export function maskPassport(value: string): string {
  return value.length <= 4 ? '••••' : `${'•'.repeat(Math.min(value.length - 4, 6))}${value.slice(-4)}`
}
