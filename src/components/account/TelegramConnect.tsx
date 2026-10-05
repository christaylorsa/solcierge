'use client'

import { useEffect, useRef, useState } from 'react'

const POLL_MS = 3000
const POLL_FOR_MS = 5 * 60 * 1000

/**
 * Links the member's Telegram so the desk can reach a wallet-only member. Opens
 * the bot with a one-time code, then polls until the bot reports the chat linked.
 */
export function TelegramConnect({ connected: initial, compact = false }: { connected: boolean; compact?: boolean }) {
  const [connected, setConnected] = useState(initial)
  const [state, setState] = useState<'idle' | 'opening' | 'waiting' | 'removing'>('idle')
  const [link, setLink] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => stopPolling(), [])

  function stopPolling() {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
  }

  async function connect() {
    setState('opening')
    setError(null)
    // Opened before the fetch so mobile browsers treat it as a user action, not a popup.
    const tab = window.open('', '_blank')
    try {
      const res = await fetch('/api/me/telegram', { method: 'POST' })
      const body = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !body.url) throw new Error(body.error ?? 'Could not reach Telegram.')

      setLink(body.url)
      if (tab) tab.location.href = body.url
      else window.location.href = body.url

      setState('waiting')
      const started = Date.now()
      stopPolling()
      timer.current = setInterval(async () => {
        if (Date.now() - started > POLL_FOR_MS) {
          stopPolling()
          setState('idle')
          return
        }
        try {
          const check = await fetch('/api/me/telegram', { cache: 'no-store' })
          const status = (await check.json()) as { connected?: boolean }
          if (status.connected) {
            stopPolling()
            setConnected(true)
            setState('idle')
          }
        } catch {
          // Keep polling; a blip should not end the wait.
        }
      }, POLL_MS)
    } catch (cause) {
      tab?.close()
      setError(cause instanceof Error ? cause.message : 'Could not reach Telegram.')
      setState('idle')
    }
  }

  async function disconnect() {
    setState('removing')
    setError(null)
    try {
      const res = await fetch('/api/me/telegram', { method: 'DELETE' })
      if (!res.ok) throw new Error('Could not disconnect. Try again.')
      setConnected(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not disconnect. Try again.')
    } finally {
      setState('idle')
    }
  }

  return (
    <div className={compact ? '' : 'border border-line bg-surface p-6 sm:p-7'}>
      <p className="eyebrow">Updates on Telegram</p>

      {connected ? (
        <>
          <p className="mt-4 flex items-center gap-2 text-sm text-success">
            <span className="block h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
            Connected
          </p>
          <p className="mt-2 text-xs leading-relaxed text-faint">
            You get a message when a quote is ready, when a booking is confirmed and when the desk
            shares documents.
          </p>
          <button
            type="button"
            onClick={() => void disconnect()}
            disabled={state !== 'idle'}
            className="btn btn-quiet mt-4 !px-0"
          >
            {state === 'removing' ? 'Disconnecting' : 'Disconnect'}
          </button>
        </>
      ) : (
        <>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Get a message the moment your quote lands or your paperwork is ready. No email needed.
          </p>
          <button
            type="button"
            onClick={() => void connect()}
            disabled={state === 'opening'}
            className="btn btn-ghost mt-5"
          >
            {state === 'opening' ? 'Opening Telegram' : state === 'waiting' ? 'Open Telegram again' : 'Connect Telegram'}
          </button>
          {state === 'waiting' ? (
            <p className="mt-4 text-xs leading-relaxed text-faint" role="status">
              In Telegram, tap <span className="text-muted">Start</span>. This updates by itself once
              it is done.{' '}
              {link ? (
                <a href={link} target="_blank" rel="noopener noreferrer" className="link-underline">
                  Telegram did not open?
                </a>
              ) : null}
            </p>
          ) : null}
        </>
      )}

      {error ? (
        <p className="mt-4 border-l-2 border-danger pl-4 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
