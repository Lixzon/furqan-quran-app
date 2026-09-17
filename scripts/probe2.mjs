// Deeper probe: dump exact shapes.
const j = async (u) => (await fetch(u, { headers: { accept: 'application/json' } })).json();

// 1) range support on cdn
const r1 = await fetch('https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/1.mp3', { headers: { Range: 'bytes=0-99' } });
console.log('RANGE status', r1.status, 'accept-ranges', r1.headers.get('accept-ranges'), 'content-range', r1.headers.get('content-range'), 'len', r1.headers.get('content-length'));

// 2) editions shape
try {
  const d = await j('https://api.alquran.cloud/v1/surah/2/editions/quran-uthmani,en.sahih,en.transliteration');
  console.log('EDITIONS data type:', Array.isArray(d.data) ? 'array' : typeof d.data, 'code', d.code);
  if (Array.isArray(d.data)) {
    const e0 = d.data[0];
    console.log('ed0 keys', Object.keys(e0));
    console.log('surah2 a1 ar[:70]:', JSON.stringify(e0.ayahs[0].text.slice(0, 70)));
    console.log('surah1? surah key', e0.surah ? JSON.stringify(e0.surah) : 'no surah object');
    console.log('ed count', d.data.length, 'identifiers', d.data.map((x) => x.edition?.identifier));
  } else {
    console.log('EDITIONS sample', JSON.stringify(d).slice(0, 500));
  }
} catch (e) {
  console.log('EDITIONS err', String(e));
}

// 3) quran.com timings shape for Alafasy chapter 1
try {
  const d = await j('https://api.quran.com/api/v4/recitations/7/by_chapter/1');
  const af = d.audio_files;
  console.log('QC audio_files[0] keys:', af && af[0] ? Object.keys(af[0]) : 'none');
  console.log('QC audio_files[0]:', af && af[0] ? JSON.stringify(af[0]) : 'none');
} catch (e) {
  console.log('QC err', String(e));
}

// 4) islamic.network per-ayah? try common pattern
try {
  const r = await fetch('https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/1.mp3');
  console.log('surah full status', r.status);
} catch (e) { console.log('err', String(e)); }
