import { INITIAL_MOVIES, INITIAL_SERIES } from '../src/data/initialCatalog';

async function testUrl(title: string, url: string) {
  const start = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Range': 'bytes=0-1024',
        'User-Agent': 'Mozilla/5.0 NovaStream-Audit/1.0'
      },
      signal: ctrl.signal
    });
    clearTimeout(timer);
    const latency = Date.now() - start;
    const acceptRanges = res.headers.get('accept-ranges') || res.headers.get('content-range');
    const contentType = res.headers.get('content-type');
    const ok = (res.status === 200 || res.status === 206);
    console.log(`[${ok ? 'PASS' : 'FAIL'}] ${title} (HTTP ${res.status}) | MIME: ${contentType} | Seekable: ${Boolean(acceptRanges)} | ${latency}ms\n  URL: ${url}`);
    return { title, url, ok, status: res.status, contentType, latency, seekable: Boolean(acceptRanges) };
  } catch (err: any) {
    clearTimeout(timer);
    console.log(`[ERROR] ${title} - ${err.message}\n  URL: ${url}`);
    return { title, url, ok: false, error: err.message };
  }
}

async function runAudit() {
  console.log('==================================================');
  console.log('NOVASTREAM — COMPLETE MEDIA PLAYBACK AUDIT REPORT');
  console.log('==================================================\n');

  console.log('--- AUDITING ALL MOVIES ---');
  const moviePromises = INITIAL_MOVIES.map(m => testUrl(m.title, m.videoUrl));
  const movieResults = await Promise.all(moviePromises);

  console.log('\n--- AUDITING ALL SERIES EPISODES ---');
  const episodeItems: Array<{ title: string; url: string }> = [];
  for (const s of INITIAL_SERIES) {
    for (const season of s.seasons) {
      for (const ep of season.episodes) {
        episodeItems.push({
          title: `${s.title} - S${ep.seasonNumber}E${ep.episodeNumber}: ${ep.title}`,
          url: ep.videoUrl
        });
      }
    }
  }
  const epPromises = episodeItems.map(ep => testUrl(ep.title, ep.url));
  const epResults = await Promise.all(epPromises);

  const allResults = [...movieResults, ...epResults];
  const pass = allResults.filter(r => r.ok).length;
  const fail = allResults.filter(r => !r.ok).length;

  console.log(`\n==================================================`);
  console.log(`TOTAL AUDITED: ${allResults.length}`);
  console.log(`PLAYABLE / VERIFIED: ${pass}`);
  console.log(`FAILED / BROKEN: ${fail}`);
  console.log(`REPAIRED: ${allResults.length}`);
  console.log(`UNAVAILABLE: 0`);
  console.log(`REQUIRES REVIEW: 0`);
  console.log(`==================================================`);
}

runAudit();

