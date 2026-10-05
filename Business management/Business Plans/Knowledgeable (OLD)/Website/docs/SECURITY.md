# Security model

## What was wrong before

- **Login accepted any password.** The form waited one second and redirected; there was no account
  system. Every page was reachable without signing in, and "the current user" was hard-coded.
- **No data layer.** Everything lived in an in-memory mock array, so nothing was stored or protected.
- **AI endpoints were public.** Functions in `'use server'` files are HTTP endpoints; anyone could
  call them and spend the Gemini quota.
- **AI output rendered as links.** A model-supplied `javascript:` URL would have been clickable.
- **Build errors were ignored** (`ignoreBuildErrors`), hiding real crashes.
- Personal details (age, nationality) sat on the same object as the public profile.

## How it works now

**Sign-in.** Firebase Authentication (email + password, or Google). Passwords never touch our
servers; Firebase rate-limits guessing. Email/password accounts must verify their email before
they can post, comment, message or upload (enforced in the rules, not just the UI).

**Server session.** After sign-in the browser sends a fresh ID token to `POST /api/auth/session`.
The server verifies it and sets an `httpOnly`, `Secure`, `SameSite=Lax` cookie (`__session`, 5 days).

- A new session requires a sign-in in the last 5 minutes, so an old stolen token can't mint one.
- The endpoint rejects cross-site requests (Origin / `Sec-Fetch-Site` check + JSON-only body).
- Every signed-in page is rendered by `src/app/(app)/layout.tsx`, which verifies the cookie with
  Firebase (signature, expiry, and revocation) before anything renders. `middleware.ts` only does a
  fast "is there a cookie at all?" redirect.
- "Sign out everywhere" revokes all refresh tokens, which also invalidates every session cookie.
- Redirects after login only go to paths on this site (`safeNextPath`).

**Data.** The browser reads and writes Firestore directly, so `firestore.rules` is the real
security boundary. Highlights:

| Data | Who can read | Who can write |
| --- | --- | --- |
| Public profile `users/{uid}` | signed-in users | owner (handle can't change) |
| Private details `users/{uid}/private` | owner only | owner only |
| Reading lists `users/{uid}/library` | owner, or anyone signed in if the owner allows it | owner, only for books in the catalogue |
| Saved items / spaced repetition | owner only | owner only |
| Posts | signed-in users | verified author; author name/handle must match their profile |
| Likes, poll votes | a user sees only their own | one per user; the counter must change by exactly ±1 in the same write |
| Messages and shared files | the two participants | participants, as themselves — not if either has blocked the other |
| Highlights, notes, bookmarks, reflections | owner only | owner only |
| Block list `users/{uid}/blocked` | owner only (the blocked person isn't told) | owner only |
| Notifications | owner only | server only; owner can mark read or remove |
| Reports | admins only | any signed-in user, as themselves; evidence files are write-only |
| Email outbox `mail` | nobody | server only |
| Book catalogue | signed-in users | admins only (custom claim) |

Every field is type- and size-checked; unknown fields are rejected. `npm run test:rules` runs
48 tests that try to impersonate users, inflate likes, double-vote, read other people's messages
and private data, tamper with the catalogue, and upload disallowed files.

**Files.** `storage.rules` only allows uploads into your own folder, only images (≤10 MB),
videos (≤100 MB) and PDF/TXT/EPUB (≤25 MB). SVG and HTML are blocked (they can carry scripts).
Note: Firebase download URLs work for anyone who has the link, like most social-media CDNs —
don't post material that must stay private. Files shared in chats are different: they never get
a public link, and only the two people in the conversation can open them (the storage rules check
the conversation; this uses a cross-service rule, so approve the permission the Firebase CLI asks
for on the first `npm run deploy:rules`). Report evidence can be uploaded by the reporter but read
only by admins.

**Blocking and reporting.** Blocking is enforced by the rules (no messages, comments, follows or
chat files either way) and removes follows in both directions. Reports are stored in `reports`
with the reason, details, evidence text and up to three images/PDFs, readable only by admins
until the admin area is built.

**Notifications.** `/api/notify` trusts nothing from the request: it looks up the like, comment,
follow or message itself, checks the signed-in user really made it, skips people who blocked the
sender, and rate-limits each user. Push messages contain only a short text and an in-app link;
the service worker only opens pages on this site. `/api/cron/morning` requires the `CRON_SECRET`
bearer token (compared in constant time).

**AI helpers.** Each Gemini action (`src/ai/guard.ts`) requires a valid session, validates and
caps input size, and is limited to 20 calls per user per 10 minutes. Errors are returned as
friendly messages; details stay in server logs. AI-suggested links are only shown if they are
plain `http(s)` URLs.

**Browser hardening** (`next.config.ts`): Content-Security-Policy (scripts, frames and network
calls limited to this site and Google/Firebase), clickjacking protection (`frame-ancestors 'none'`),
HSTS, `nosniff`, a strict referrer policy and a permissions policy.

**Search lookups** (`/api/discover`, `/api/library/import`) run on the server behind the session
check and a per-user rate limit. Only the search term goes to Open Library and OpenAlex — never
who searched. Books are added to the catalogue with metadata fetched from Open Library by the
server, not taken from the request, so users can't inject catalogue entries.

**Deleting an account** (Settings → Account → Delete Account) requires re-entering the password
(or re-doing Google sign-in). The server checks both the session and the fresh sign-in, then
removes the profile, private data, posts, comments, likes, votes, follows, conversations,
uploaded files and the login itself.

## Secrets

- `.env*` files are git-ignored (the Gemini key was never committed). Only `.env.example` is tracked.
- `NEXT_PUBLIC_FIREBASE_*` values are *identifiers*, not secrets — safe in the browser.
- `GEMINI_API_KEY`, `CRON_SECRET` and `FIREBASE_SERVICE_ACCOUNT_KEY` are server-only.
  `NEXT_PUBLIC_FIREBASE_VAPID_KEY` is the *public* half of the push key pair (safe in the browser). On App Hosting, store the
  Gemini key as a secret; the service account isn't needed there.

## Recommended next steps

1. **Firebase App Check** (reCAPTCHA Enterprise) so only your app can call Firestore/Storage.
2. **Moderation**: the admin review queue for reports; automated checks on uploads.
3. Move the AI rate limiter to Firestore if you run more than one server instance.
4. A privacy policy and terms (the Help Center links are still placeholders) — needed before launch,
   especially for GDPR since the app stores reading history and messages.
