# LIXZON Ecosystem — Product Brief

## Status and resume instructions

This brief consolidates the user's Mishkah and Furqan product prompts and later rough-sketch revisions. The user has authorized implementation: preserve working features and implement missing requirements. The visual direction remains provisional until the user provides a more complete design sketch.

Resolved implementation decisions:

- Mishkah has five destinations: Home, Library, Community Hub, Guidance, and Profile.
- Community Hub is a nonfunctional placeholder for now; do not build proposals, voting, or chat yet.
- Qibla belongs under Guidance.
- Preserve Furqan's existing React/Vite web architecture; `npm run build:web` should build its static Vite app, not migrate it to Expo.

## Provisional product direction

- Mishkah and Furqan are sibling apps in one LIXZON ecosystem, with suitable shared reading, streak, memorization, and daily-highlight data.
- The user wants a more deliberately arranged, nature-inspired interface (for example, river/forest/tree motifs) while retaining an original LIXZON design rather than copying a reference. A more detailed sketch is expected later.
- A later rough sketch describes Home, Prayer & Fasting, Guidance, Library, and Profile, but the user's resolved navigation decision above takes precedence.
- The nature-inspired interface remains a future visual-design iteration; do not assume the current rough sketch is final.

## Mishkah

### Navigation, layout, and header

- Destinations: Home, Library, Community Hub, Guidance, Profile.
- Mobile: bottom navigation. Larger screens: persistent left-side navigation panel.
- Header: streak counter and global time/city tracker; prayer access/countdown; Rafiq AI and universal search with floating voice-search/microphone modal.
- Prayer access should expose a detailed schedule with interactive check-offs and alarm toggles.

### Home and daily content

- Daily dashboard for rhythms, prayer countdown, global time, and curated content.
- Show Hadith and Du'a prominently and browse Du'as by intention/category, including repentance/forgiveness, provision, protection, blessings, and related categories. Hadith should be presented with authentic collection/ranking/source information.
- QHD proposal: one Quran Verse of the Day area plus Hadith and Du'a panels; sync the verse with Furqan and support refresh. The later sketch asks for a more vertically organized, less plain layout. Confirm the final composition after the user's design sketch.
- Include a time-aware Sunnah/Adhkar widget, such as morning adhkar or pre-sleep supplications.
- Secondary content: Prophetic stories and historical archives, notable characters/Sahaba, signs of the Day of Judgment, and Dajjal.
- Visual styling should blend nature-inspired elements into an original interface; do not treat the current rough sketch as final visual design.

### Prayer, fasting, Qibla, and calendar

- Prayer timing and fasting schedules, prayer countdown, and a global time tracker.
- Lunar calendar and countdowns for Ramadan, Eid, and sacred months.
- Qibla pointer/compass with Kaaba indicators and smooth directional feedback.
- Qibla belongs under Guidance.

### Guidance, wellness, and archives

- Guidance includes At-Tibb (Prophetic medicine/remedies), halal dietary items, natural remedies and foods (including honey, black seed, and olive oil), physical Sunnah habits/exercises, daily spiritual quotes/sayings, and recommended wellness routines.
- Include Adab and practical daily supplications (toilet, eating, sleeping, prayer), plus Halal/Haram moral and physical lifestyle guidance, including posture and restricted-food guidance.
- Library stores Hadith collections, Hisn al-Muslim Du'as, Adhkar, Prophetic stories, character histories, end-times signs, and relevant multimedia links.
- Favorites and audio-play tracking: after more than 100 plays, mark an item as memorized and show a visual progress ring.
- Offline-first caching for Hadith, Du'as, Adhkar, and cached audio using platform-appropriate storage (IndexedDB for web; AsyncStorage or the native equivalent where appropriate).

### Digital Tasbeeh and post-salah adhkar

- Five counters: Subhanallah (0/33), Alhamdulillah (0/33), Allahu Akbar (0/34), Astaghfirullah (0/infinity), and La ilaha illallah (0/1 to infinity).
- Individual resets and an overall reset protected by a confirmation dialog.
- Optional haptic feedback.
- Optional auto-reset after salah; reset finite counters while preserving Astaghfirullah unless the user clears it manually.

### Community Hub

- Keep the tab as a nonfunctional placeholder for now. Do not implement the earlier proposal/bulletin-board idea or open chat without a new request.

### Rafiq AI

- Rafiq is a guide and deep-link router that can explain where features are or navigate to requested screens, verses, Du'a categories, or settings.
- It must not directly change toggles or mutate unrelated UI state. Deep-link navigation is allowed.
- Earlier request: continuous, hands-free conversational voice mode with a live-call experience that remains active across app navigation until exited. Include only if feasible with the selected voice provider and platform permissions; identify required external services/configuration.

## Furqan

### Quran reader and audio

- Distraction-free Arabic/translation reader with typography scaling, bookmarking, and good native performance.
- Minimal audio HUD with playback controls, reciter selection, repeat loops, background audio management, and appropriate play/pause, like, share, and short-segment/verse actions. The prompts describe both a simple HUD and a six-button HUD; confirm the final controls during design.
- Track repeated verse audio plays; more than 100 plays marks a verse memorized with a progress ring.

### Web deployment and ecosystem sync

- The React/Vite app lives at the workspace root (`src/`); `npm run build` and `npm run build:web` produce the static `dist` output for Vercel. Its existing Mishkah web destinations and routes are included in that build; the native Expo Mishkah app remains a separate workspace.
- Sync reading streaks, memorization milestones, and daily/QHD highlights between Furqan and Mishkah in real time through the shared Supabase-backed dispatcher.

## Production and validation expectations

- Treat this as a multi-phase product, not a single-file task.
- Keep both apps functional, mobile-first, accessible, and offline-capable where requested.
- Do not claim production readiness for integrations that depend on unavailable credentials or backend/provider setup. Identify any required Supabase schema, security policies, Google Auth configuration, voice provider, and deployment settings.
- Validate the relevant app tests, type checks, and builds after implementation.

## Current implementation notes

- Implemented: Mishkah's Stories library replaces the Community placeholder — six sections (25 prophets in order, Companions, the next generation, past nations, signs of the Hour, the Hereafter), each story with a short and a long reading, inline Qur'an references that open the full surah in Furqan, and a video link for a fuller talk. Mishkah also gained OLED and Parchment themes, a cross-tab motion transition, and a fix for desktop-web scrolling where the main column had been sized by its content and could not scroll.
- Implemented: Furqan completed-audio play tracking with a >100-play memorization threshold and progress display, and a private pairing-code sync of reading streaks, memorization records, and deterministic daily highlights. Mishkah reads Furqan's streak and today's verse from the same pairing, writes its own engagement snapshot, and every Qur'an reference opens the full surah in Furqan.
- Existing functionality intentionally retained: offline prayer calculations and city/time-zone support, fasting checklist/reminders, local worship content, on-device Rafiq text answers, Furqan Quran reader/audio/bookmarks/offline storage, and memorization controls. Google sign-in has been removed from both apps.
- External setup remains required before cross-device sync is live: create/configure the shared Supabase project, apply both included migrations, and provide each app's public Supabase URL/key. Furqan's App health page and Mishkah's Settings both show the device's latest weekly system report. Continuous voice mode remains disabled until a secure voice provider/gateway is selected and platform audio permissions are integrated; the new UI explicitly states that no audio is recorded. Community Hub remains a placeholder, and the final visual redesign awaits the user's sketch.
