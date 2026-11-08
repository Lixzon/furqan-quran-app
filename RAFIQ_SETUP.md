# Rafiq online and offline guidance

Rafiq always keeps the reviewed local guide available offline. Online answers
are optional and require a deployed HTTPS service; no AI provider key is
included in either app.

## Configure the online service

Set `VITE_MISHKAH_AI_ENDPOINT` in Furqan's build environment to the endpoint
that implements Furqan's verified-answer contract. Set
`EXPO_PUBLIC_RAFIQ_API_URL` in Mishkah's build environment to its answer-and-
sources endpoint. The clients validate different response contracts, so a
shared backend must support both request formats or provide a compatible route
for each app. Keep provider credentials on the server.

Furqan sends a JSON request containing `question`, optional `schoolId` and
`country`, an approved source catalog, and verification guardrails. It accepts
only a response marked `verified: true`, with a non-empty answer, recognized
source IDs, the requested school ID, and verified school-specific reasoning
and HTTPS evidence whenever a school-specific ruling is returned. The client
falls back to the local guide when the service is unavailable.

Mishkah sends `{ "query": "question", "locale": "en" }` and expects
`{ "answer": "response", "sources": [{ "title": "Source", "url":
"https://example.org/article" }] }`. Mishkah requires HTTPS citations and
limits the answer length and number of displayed sources.

Both apps need to be rebuilt after changing their endpoint configuration.
Without an endpoint, Rafiq remains offline-only and the interface should say
that online answers are not configured rather than imply they are live.

## Google sign-in and shared progress

Web sign-in uses the Google provider configured in the shared Supabase project.
Configure the project's OAuth redirect allow-list for both app origins. Native
Mishkah builds additionally require the iOS and Android OAuth client IDs
described in [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md). Both apps must use the
same Supabase project and the same Google account for progress to sync.
