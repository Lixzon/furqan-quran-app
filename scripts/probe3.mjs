// Final probe: does alquran.cloud give per-ayah audio or segments for sync?
const j = async (u) => (await fetch(u, { headers: { accept: 'application/json' } })).json();

const d1 = await j('https://api.alquran.cloud/v1/surah/1/ar.alafasy');
const s = d1.data;
console.log('surah/audio edition keys:', Object.keys(s).join(','));
console.log('ayah[0] keys:', Object.keys(s.ayahs[0]).join(','));
console.log('ayah[0]:', JSON.stringify(s.ayahs[0]).slice(0, 300));
console.log('edition:', JSON.stringify(s.edition));

const d2 = await j('https://api.alquran.cloud/v1/ayah/262/ar.alafasy');
console.log('single ayah keys:', Object.keys(d2.data).join(','));
console.log('single ayah audio sample:', JSON.stringify(d2.data.audio)?.slice(0, 160));
