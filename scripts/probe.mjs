// Probe external endpoints to confirm data assumptions before finalising the engine.
const h = (m, u) => fetch(u, { method: m, headers: { accept: 'application/json' } });

const out = {};
try {
  const r = await h('GET', 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/1.mp3');
  out.cdn_surah1 = { status: r.status, len: r.headers.get('content-length'), range: r.headers.get('accept-ranges') };
} catch (e) { out.cdn_surah1 = { err: String(e) }; }

try {
  const r = await h('GET', 'https://api.alquran.cloud/v1/surah/2/editions/quran-uthmani,en.sahih,en.transliteration');
  const j = await r.json();
  const ed = j.data;
  out.editions = {
    count: ed.length,
    ids: ed.map((x) => x.edition.identifier),
    surah2_ayah1_ar_head: ed[0].ayahs[0].text.slice(0, 80),
    surah2_ayah1_tr: ed[1].ayahs[0].text.slice(0, 60),
    surah2_ayah1_tl: ed[2].ayahs[0].text.slice(0, 60),
    surah1_ayah1_ar: ed[0].surah.number === 1 ? '' : undefined,
  };
} catch (e) { out.editions = { err: String(e) }; }

try {
  const r = await h('GET', 'https://api.quran.com/api/v4/recitations/7/by_chapter/1');
  const j = await r.json();
  const af = j.audio_files;
  out.qurancom_timings = {
    status: r.status,
    count: af?.length,
    first: af?.[0] && { key: af[0].verse_key, ts: af[0].timestamp_from, to: af[0].timestamp_to },
    last: af?.[af.length - 1] && { key: af[af.length - 1].verse_key, ts: af[af.length - 1].timestamp_from },
    audioUrl: af?.[0]?.url,
  };
} catch (e) { out.qurancom_timings = { err: String(e) }; }

try {
  const r = await h('GET', 'https://api.alquran.cloud/v1/meta');
  const j = await r.json();
  out.meta = { status: r.status, has: !!j.data };
} catch (e) { out.meta = { err: String(e) }; }

console.log(JSON.stringify(out, null, 2));
