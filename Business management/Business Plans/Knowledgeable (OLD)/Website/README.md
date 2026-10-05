# Knowledgeable

Learn a little every day: bite-sized **ideas** from books and papers, **summaries**, **discussion
questions**, **polls**, short **reels**, and **full public-domain books** you can read in the app —
with your reading progress, and what you've finished, on your profile.

Built with Next.js 15 (App Router) + Firebase (Auth, Firestore, Storage) + Genkit/Gemini.

- Product direction and roadmap: [docs/PRODUCT.md](docs/PRODUCT.md)
- How authentication and data security work: [docs/SECURITY.md](docs/SECURITY.md)

## Run it locally (no Firebase account needed)

Needs Node 20+ and **Java 21+** (for the Firebase emulators).

```bash
npm install
cp .env.example .env.local      # then uncomment the "Local development" block
npm run emulators               # terminal 1: Auth, Firestore, Storage emulators (UI at :4000)
npm run seed                    # terminal 2: books from Project Gutenberg + demo users/posts
npm run dev                     # terminal 2: http://localhost:9002
```

Demo accounts (emulator only): `alice@demo.knowledgeable.test`, `bob@demo.knowledgeable.test`,
`charlie@demo.knowledgeable.test`, password `knowledgeable-demo-1`. Or sign up — verification
emails appear in the emulator UI (http://localhost:4000/auth).

## Connect the real Firebase project (`knowledgeable-jei7k`)

1. Firebase Console → Authentication → enable **Email/Password** and **Google**. Under Settings,
   turn on **email enumeration protection** and set a password policy (8+ chars, letter + number).
2. Project settings → your web app → copy the config into `.env.local` (`NEXT_PUBLIC_FIREBASE_*`).
3. Deploy the security rules and indexes: `npx firebase login` then `npm run deploy:rules`.
4. Add the book catalogue: `npm run seed -- --prod` (uses a service account in
   `FIREBASE_SERVICE_ACCOUNT_KEY`, or `gcloud auth application-default login`).
5. On Firebase App Hosting, set `GEMINI_API_KEY` as a secret and the `NEXT_PUBLIC_FIREBASE_*`
   values as environment variables. No service-account key is needed there.
6. **Notifications** (see below): add `NEXT_PUBLIC_FIREBASE_VAPID_KEY`, `APP_URL` and the
   `CRON_SECRET` secret, install the Trigger Email extension and create the hourly scheduler job.

## Notifications

- **In the app:** a bell in the header and a Notifications page. Likes, comments, follows and
  messages notify the other person (the server checks each one really happened first).
- **Push:** the app is installable (Add to Home Screen / Install app). The first time it is opened
  as an installed app it asks whether to turn notifications on; they can be switched on or off any
  time in Settings → Notifications. Firebase Console → Project settings → Cloud Messaging →
  *Web Push certificates* → generate a key pair and put the public key in
  `NEXT_PUBLIC_FIREBASE_VAPID_KEY`. (Push can't be tested with the emulators.) On iPhone, push
  only works for the installed app (iOS 16.4+).
- **Email:** only when someone shares a file in a chat (ordinary messages are app notifications
  only), and it can be turned off. Install the **Trigger Email from Firestore** extension
  (collection `mail`) with your SMTP provider; set `APP_URL` to the site's address so the email
  links back to the chat.
- **Morning reminder:** one a day at the hour each person picks (default 08:00 their time), with
  the ideas due for review and the book they're reading. Create a Cloud Scheduler job that runs
  every hour: `POST https://<your site>/api/cron/morning` with the header
  `Authorization: Bearer <CRON_SECRET>` (a random string of 32+ characters, e.g.
  `openssl rand -hex 32`).

## Adding your own books, papers and articles

Everything is read from our own storage (text in Firestore, original file in Cloud Storage):

- Search adds open-licence works on demand: public-domain books (Internet Archive), CC-licensed
  papers (Europe PMC) and Wikipedia articles (CC BY-SA, credited in the reader).
- For works you hold the rights to (EPUB or TXT, no DRM):
  `npm run import:file -- book.epub --title "Title" --author "Author" --kind book --topics psychology`
  (add `--prod` for the real project; `--kind paper` or `article` for other material).

## Languages

The interface is in British English, Spanish and French (Settings → Language, or the picker on
the login page). Wrap any new text in `t('…')` (or `msg('…')` where it's defined outside a
component), then run `npx tsx scripts/i18n-extract.ts` to list strings still needing a Spanish
or French entry — `npm test` fails until every string is translated.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on port 9002 |
| `npm run build` / `npm start` | Production build / serve |
| `npm run typecheck` · `npm run lint` | Type and lint checks |
| `npm test` | Unit tests (no emulators needed) |
| `npm run test:rules` | Security-rule tests against the emulators |
| `npm run emulators` | Local Firebase (data kept in `emulator-data/`) |
| `npm run seed` | Seed the emulators (`-- --prod` for the real catalogue, `-- --admin you@x.com` to grant admin) |
| `npm run import:file -- <file>` | Add an EPUB/TXT you hold the rights to (see above) |
| `npm run deploy:rules` | Deploy Firestore/Storage rules and indexes |

## Project map

```
src/app/(auth)        login, signup, forgot-password (public)
src/app/(onboarding)  /welcome — interests (Personalised Feed Setup), then handle
src/app/(public)      Help Centre and policies (readable signed in or out)
src/app/(app)         everything behind sign-in (feed, reels, library, reader, profile, chat…)
src/app/api           session cookie, account deletion, library import, notify, cron/morning
src/lib/data          all Firestore/Storage access (one module per area)
src/lib/auth          session cookies, redirects, password policy
src/ai                Gemini flows, each behind an auth + rate-limit guard
src/lib/i18n          translations — British English is the key; es.ts / fr.ts hold Spanish and French
firestore.rules       the real security boundary (tested in rules-tests/)
scripts/              seed script, Gutenberg importer, EPUB/TXT importer
public/sw.js          push-notification service worker
```
