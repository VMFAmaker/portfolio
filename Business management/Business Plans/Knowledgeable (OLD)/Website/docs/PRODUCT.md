# Product direction

**Knowledgeable** — the depth of academia, the professional signal of LinkedIn, and the pull of
Instagram, pointed at learning. People come for a few minutes of interesting content and leave
having actually learned something.

## Principles

1. **Small units, real sources.** The core unit is an *idea*: one insight, a few sentences, linked
   to the book or paper it came from (like Deepstash). Summaries, questions, polls, papers and reels
   are all built around sources.
2. **Implicit learning by design.** Knowledge sticks through repetition and variety, not willpower:
   - saved ideas **resurface in the feed** on a spaced-repetition schedule (1, 3, 7, 16, 35… days),
     each with a one-tap "Got it / Show me again";
   - the feed **interleaves** your subjects and occasionally shows *adjacent* topics
     (pick Astrophysics and you'll sometimes see Cosmology);
   - finishing a book prompts you to **share one idea** from it (explaining is remembering).
3. **Reading is the status symbol.** Profiles show what you're reading and what you've finished —
   and books finished in the in-app reader are marked "Finished on Knowledgeable".
4. **Academic and practical side by side.** Physics and philosophy next to productivity and
   communication; the taxonomy (`src/lib/taxonomy.ts`) mixes both on purpose.

## What exists now

| Area | Status |
| --- | --- |
| Accounts, onboarding (unique handle + ≥3 interests) | ✅ real |
| Personalised feed (For you / Following), infinite scroll | ✅ real |
| Post types: idea, summary, questions, opinion, article, research (PDF), poll, reel (video) | ✅ real |
| Likes, comments, share, save, one-vote-per-person polls | ✅ real |
| Spaced-repetition resurfacing of saved posts | ✅ real |
| Library of books, academic papers and articles, all stored in our own storage and read in our reader | ✅ real |
| Adding works: public-domain books (Internet Archive), CC-licensed papers (Europe PMC), Wikipedia articles, and your own EPUB/TXT files (`npm run import:file`) | ✅ real |
| Reader: sections, contents, text size, auto-saved progress, resume, finish detection | ✅ real |
| Highlights (4 colours) with notes, page bookmarks, "My notes" page that jumps back to the exact passage | ✅ real |
| Reflection after finishing (no right or wrong answers; AI can suggest questions) | ✅ real |
| Notifications: in-app, push (installed app), morning reminder, email only for shared files — all switchable | ✅ real — push/email need the setup in the README |
| File sharing in chat (images, PDF, Office, EPUB, CSV, text; private to the two people) | ✅ real |
| Report (10 reasons, details, evidence text + screenshots) and block users | ✅ real — admin review area to come |
| Reading lists + privacy toggle | ✅ real |
| Reels feed (vertical, autoplay in view) | ✅ real — no seeded videos yet |
| Follow, profiles, direct messages | ✅ real |
| Search: AI explanation (in the reader's language), our books, related books (Open Library), academic papers (OpenAlex), posts, people | ✅ real |
| Interface in British English, Spanish and French | ✅ real |
| Help Centre, User Agreement, Privacy Policy, Community Guidelines | ✅ drafts — need legal review |
| Mobile: bottom tab bar; desktop: sidebar that slides over the page | ✅ real |
| Settings, account details, password change, delete account | ✅ real |

## Roadmap (suggested order)

1. **Content supply.** An empty feed kills a social app. Seed 200–500 high-quality ideas across the
   taxonomy (editorial team or AI-assisted drafts reviewed by humans), plus 20–30 reels.
2. **Licensed reading.** Public-domain works are free to host. For modern books, partner with
   publishers or open-access platforms (OAPEN, DOAB, arXiv, PubMed Central) rather than user
   uploads — hosting copyrighted books without a licence is the fastest way to get shut down.
   The reader works from `books/{id}/chapters`; `npm run import:file` loads EPUB/TXT files.
3. **Highlights → ideas**: one tap turns a highlighted passage into an idea draft.
4. **Admin area**: review reports, act on accounts, manage the catalogue.
5. **Streaks and a weekly "what you learned" recap** built from finished books, ideas saved and
   reviews answered.
6. **Better search** (Algolia or Typesense extension) once there's enough content.
7. **Trust**: verified academics (badge via ORCID), community guidelines.
8. **Mobile**: the web app is installable (PWA) with push; build native apps only if needed.
9. **Icons over words**: many labels (post types, profile tabs, settings sections) can later become pictures.

## Metrics worth watching

- Ideas saved per active user per week, and % of resurfaced ideas answered "Got it".
- Reader minutes per week and books finished in-app.
- Share of posts with a source attached.
- Day-7 and day-30 retention.
