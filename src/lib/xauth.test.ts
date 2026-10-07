import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { authorizeUrl, challengeFor, newVerifier, parseMe, safeAvatarUrl } from './xauth.ts'

test('PKCE challenge is the S256 of the verifier', () => {
  const verifier = newVerifier()
  assert.match(verifier, /^[A-Za-z0-9_-]{43,128}$/)
  assert.equal(challengeFor(verifier), createHash('sha256').update(verifier).digest('base64url'))
})

test('the authorize link asks for read scopes only', () => {
  const url = new URL(
    authorizeUrl({ clientId: 'cid', redirectUri: 'https://solcierge.xyz/api/x/callback', state: 's', verifier: 'v'.repeat(43) }),
  )
  assert.equal(url.origin, 'https://x.com')
  assert.equal(url.searchParams.get('scope'), 'users.read tweet.read')
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256')
  assert.equal(url.searchParams.get('redirect_uri'), 'https://solcierge.xyz/api/x/callback')
})

test('avatars come from X only, at the larger size', () => {
  assert.equal(
    safeAvatarUrl('https://pbs.twimg.com/profile_images/123/abc_normal.jpg'),
    'https://pbs.twimg.com/profile_images/123/abc_400x400.jpg',
  )
  assert.equal(safeAvatarUrl('http://pbs.twimg.com/a_normal.jpg'), null)
  assert.equal(safeAvatarUrl('https://evil.example/a_normal.jpg'), null)
  assert.equal(safeAvatarUrl('https://pbs.twimg.com.evil.example/a.jpg'), null)
  assert.equal(safeAvatarUrl(42), null)
})

test('users/me is read defensively', () => {
  assert.deepEqual(
    parseMe({ data: { id: '44196397', username: 'solcierge', name: '  Sol   Desk ', profile_image_url: 'https://pbs.twimg.com/p/x_normal.png' } }),
    { id: '44196397', username: 'solcierge', name: 'Sol Desk', avatarUrl: 'https://pbs.twimg.com/p/x_400x400.png' },
  )
  assert.equal(parseMe({ data: { id: 'abc', username: 'ok' } }), null)
  assert.equal(parseMe({ data: { id: '1', username: 'has space' } }), null)
  assert.equal(parseMe({ errors: [] }), null)
  assert.equal(parseMe({ data: { id: '1', username: 'quiet' } })?.name, 'quiet')
})
